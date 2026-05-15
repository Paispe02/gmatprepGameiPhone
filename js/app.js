/* ===== GMAT Free Trainer — App Core Engine ===== */

const App = (() => {
  // ── STATE ──
  let currentView = 'dashboard';
  let currentModule = null;
  let currentQuestion = null;
  let stopwatchStart = 0;
  let stopwatchInterval = null;
  let sessionCorrect = 0;
  let sessionTotal = 0;
  let sessionTimes = [];
  let answered = false;

  // Module settings
  let multTables = [2,3,4,5,6,7,8,9,10,11,12];
  let arithDifficulty = 'easy';
  let pctDifficulty = 'easy';
  let wpDifficulty = 'all';
  let btCategory = 'all';
  let ntDifficulty = 'all';
  let estDifficulty = 'all';
  let dsDifficulty = 'all';
  let edDifficulty = 'all';
  let fqDifficulty = 'all';
  let qsDifficulty = 'all';
  let cdDifficulty = 'all';
  let srDifficulty = 'easy';
  let mcDifficulty = 'easy';
  let vsDifficulty = 'easy';
  let mqDifficulty = 'all';
  let diDifficulty = 'all';
  let crDifficulty = 'all';
  let rdDifficulty = 'all';

  // Question browser state (for WP and BT modules)
  let questionPool = [];     // filtered question list
  let questionIndex = -1;    // current index in pool
  let completedIds = new Set(); // IDs of answered questions (per user)

  const SPEED_MODULES = ['multiplication', 'arithmetic', 'percentages'];

  // ── COMPLETED QUESTIONS PERSISTENCE ──
  function _completedKey() {
    return `gmat_completed_${Stats.getActiveUser()}`;
  }
  function loadCompleted() {
    try {
      const raw = localStorage.getItem(_completedKey());
      completedIds = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { completedIds = new Set(); }
  }
  function saveCompleted() {
    localStorage.setItem(_completedKey(), JSON.stringify([...completedIds]));
  }

  // ── CLEANUP ──
  function cleanupModule() {
    if (stopwatchInterval) { clearInterval(stopwatchInterval); stopwatchInterval = null; }
    if (examState && examState.timerInterval) { clearInterval(examState.timerInterval); examState.timerInterval = null; }
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    answered = false;
    currentQuestion = null;
  }

  // ── NAVIGATION ──
  function navigate(view) {
    cleanupModule();
    // If leaving a module, save session
    if (currentModule && sessionTotal > 0) {
      const avg = sessionTimes.reduce((a,b) => a+b, 0) / sessionTimes.length;
      Stats.saveSession(currentModule, sessionCorrect, sessionTotal, avg);
    }
    currentModule = null;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');
    const link = document.querySelector(`.nav-links a[data-view="${view}"]`);
    if (link) link.classList.add('active');

    currentView = view;
    if (view === 'dashboard') renderDashboard();
    if (view === 'tricks') renderTricks();
    if (view === 'learn') renderLearn();
    if (view === 'review') renderReview();
    if (view === 'examSim') renderExamSetup();
  }

  function startModule(module) {
    // Save previous session if switching directly between modules
    if (currentModule && sessionTotal > 0) {
      const avg = sessionTimes.reduce((a,b) => a+b, 0) / sessionTimes.length;
      Stats.saveSession(currentModule, sessionCorrect, sessionTotal, avg);
    }
    cleanupModule();
    currentModule = module;
    sessionCorrect = 0;
    sessionTotal = 0;
    sessionTimes = [];
    loadCompleted();

    // Switch view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const el = document.getElementById('view-' + module);
    if (el) el.classList.add('active');
    const link = document.querySelector(`.nav-links a[data-view="${module}"]`);
    if (link) link.classList.add('active');
    currentView = module;

    renderModuleUI();

    // For curated modules, build question pool and show browser
    if (isBrowserModule(module)) {
      rebuildPool();
      if (questionPool.length > 0) {
        // Start with first unanswered, or first
        const first = questionPool.findIndex(q => !completedIds.has(q.id));
        goToQuestion(first >= 0 ? first : 0);
      }
    } else {
      nextQuestion();
    }
  }

  // ── STOPWATCH ──
  function startStopwatch() {
    stopwatchStart = performance.now();
    const display = getEl('stopwatch-display');
    if (display) {
      stopwatchInterval = setInterval(() => {
        display.textContent = formatStopwatch(performance.now() - stopwatchStart);
      }, 100);
    }
  }
  function stopStopwatch() {
    if (stopwatchInterval) clearInterval(stopwatchInterval);
    stopwatchInterval = null;
    return Math.round(performance.now() - stopwatchStart);
  }
  function formatStopwatch(ms) {
    const sec = Math.floor(ms/1000), tenths = Math.floor((ms%1000)/100);
    const min = Math.floor(sec/60), s = sec%60;
    return min > 0 ? `${min}:${String(s).padStart(2,'0')}.${tenths}` : `${s}.${tenths}s`;
  }

  // ── DASHBOARD ──
  function renderDashboard() {
    const stats = Stats.getAll();
    const el = document.getElementById('view-dashboard');
    const activeUser = Stats.getActiveUser();
    const allUsers = Stats.getAllUsers();

    const mods = {
      multiplication: { name:'Multiplication Tables', icon:'✕', desc:'Drill your times tables from 2 to 12' },
      arithmetic:     { name:'Mental Arithmetic',     icon:'🧮', desc:'Addition, subtraction, multiplication, division' },
      percentages:    { name:'Percentages & Ratios',   icon:'%',  desc:'Fractions, percentages, ratios, financial math' },
      wordProblems:   { name:'GMAT Word Problems',     icon:'📝', desc:'Work-rate, distance, mixtures, probability' },
      brainTeasers:   { name:'Brain Teasers',           icon:'🧩', desc:'Logic puzzles, balance scales, patterns' },
      numberTheory:   { name:'Number Theory',           icon:'🔢', desc:'Divisibility, primes, GCD/LCM, remainders' },
      estimation:     { name:'Estimation',              icon:'📐', desc:'Quick approximation and order of magnitude' },
      dataSufficiency: { name:'Data Sufficiency',       icon:'📊', desc:'GMAT DS format — is the info enough?' },
      errorDetection: { name:'Error Detection',         icon:'🔍', desc:'Find the mistake in the solution' },
      fastQuant:      { name:'Fast Quant Reading',      icon:'⚡', desc:'Parse verbose problems quickly' },
      quantStrategy:  { name:'Quant Strategy',          icon:'♟️', desc:'Choose the optimal solving method' },
      constraintDeduction: { name:'Constraint Deduction', icon:'🧠', desc:'Logic grids, seating, scheduling' },
      speedRecognition: { name:'Speed Recognition',     icon:'⏱️', desc:'Instant pattern recognition (3-8 sec)' },
      memoryChunking: { name:'Memory & Chunking',       icon:'🧠', desc:'Memorize expression, then solve' },
      visualSpatial:  { name:'Visual-Spatial',          icon:'👁️', desc:'Sequences, patterns, spatial reasoning' },
      mimQuant:      { name:'MiM Practice: Quant',    icon:'🎓', desc:'90 quantitative questions — PS & DS format' },
      dataInsights:  { name:'Data Insights',           icon:'📈', desc:'Tables, charts & multi-source reasoning' },
      criticalReasoning: { name:'Critical Reasoning',  icon:'💬', desc:'Logical arguments and assumptions' },
      riddles:       { name:'Riddles & Lateral Thinking', icon:'🎭', desc:'Verbal riddles, wordplay, and lateral thinking puzzles' },
    };

    let html = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <span style="font-size:0.88rem;color:var(--text-light)">Player:</span>
        <select id="user-select" onchange="App.switchUser(this.value)" style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;background:var(--card)">
          ${allUsers.map(u => `<option value="${esc(u)}" ${u===activeUser?'selected':''}>${esc(u)}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" onclick="App.addNewUser()">+ New Player</button>
        <button class="btn btn-outline btn-sm" onclick="App.resetStats()" style="margin-left:auto;color:var(--danger);border-color:var(--danger)">Reset Stats</button>
        ${allUsers.length > 1 ? `<button class="btn btn-outline btn-sm" onclick="App.deleteCurrentUser()" style="color:var(--danger);border-color:var(--danger)">Delete Player</button>` : ''}
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${stats.totalAnswered}</div><div class="stat-label">Questions Answered</div></div>
        <div class="stat-card"><div class="stat-value">${Stats.getAccuracy()}%</div><div class="stat-label">Overall Accuracy</div></div>
        <div class="stat-card"><div class="stat-value">${stats.bestStreak}</div><div class="stat-label">Best Streak</div></div>
        <div class="stat-card"><div class="stat-value">${stats.currentStreak}</div><div class="stat-label">Current Streak</div></div>
      </div>
      <h2 style="margin-bottom:16px">Choose a Module</h2>
      <div class="module-grid">
    `;

    for (const [key, info] of Object.entries(mods)) {
      const mod = stats.modules[key];
      const avgTime = Stats.getAvgTime(key);
      const acc = mod.answered > 0 ? Math.round((mod.correct/mod.answered)*100) : 0;
      html += `
        <div class="module-card" onclick="App.startModule('${key}')">
          <h3>${info.icon} ${info.name}</h3>
          <p>${info.desc}</p>
          <div class="module-stats">${mod.answered > 0
            ? `${mod.answered} answered · ${acc}% · avg ${Stats.formatTime(avgTime)}${mod.bestTime ? ` · best ${Stats.formatTime(mod.bestTime)}` : ''}`
            : 'Not started yet'}</div>
        </div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ── USER MANAGEMENT ──
  function switchUser(name) { Stats.setActiveUser(name); renderDashboard(); }
  function addNewUser() {
    const name = prompt('Enter new player name:');
    if (!name || !name.trim()) return;
    const t = name.trim();
    if (!Stats.addUser(t)) { alert('Player already exists!'); return; }
    Stats.setActiveUser(t);
    renderDashboard();
  }
  function deleteCurrentUser() {
    const u = Stats.getActiveUser();
    if (!confirm(`Delete player "${u}" and all their stats?`)) return;
    Stats.deleteUser(u);
    renderDashboard();
  }
  function resetStats() {
    if (!confirm(`Reset all stats for "${Stats.getActiveUser()}"?`)) return;
    Stats.reset();
    renderDashboard();
  }

  // ── MODULE UI ──
  const TITLES = {
    multiplication:'Multiplication Tables', arithmetic:'Mental Arithmetic',
    percentages:'Percentages, Fractions & Ratios',
    wordProblems:'GMAT Word Problems', brainTeasers:'Brain Teasers',
    numberTheory:'Number Theory', estimation:'Estimation & Approximation',
    dataSufficiency:'Data Sufficiency', errorDetection:'Error Detection',
    fastQuant:'Fast Quant Reading', quantStrategy:'Quant Strategy',
    constraintDeduction:'Constraint Deduction', speedRecognition:'Speed Recognition',
    memoryChunking:'Memory & Chunking', visualSpatial:'Visual-Spatial Patterns',
    mimQuant:'MiM Practice: Quantitative', dataInsights:'Data Insights',
    criticalReasoning:'Critical Reasoning',
    riddles:'Riddles & Lateral Thinking',
  };

  const BROWSER_MODULES = ['wordProblems','brainTeasers','numberTheory','estimation','dataSufficiency','errorDetection','fastQuant','quantStrategy','constraintDeduction','mimQuant','dataInsights','criticalReasoning','riddles'];
  function isBrowserModule(m) { return BROWSER_MODULES.includes(m); }

  function renderModuleUI() {
    const el = document.getElementById('view-' + currentModule);
    if (!el) return;
    const modStats = Stats.getModule(currentModule);
    const showBest = modStats.bestTime ? `<span class="best-time">Best: ${Stats.formatTime(modStats.bestTime)}</span>` : '';
    const isBrowser = isBrowserModule(currentModule);

    let html = `
      <div class="quiz-header">
        <h2>${TITLES[currentModule]}</h2>
        <div class="quiz-controls">
          <div class="stopwatch" id="stopwatch-display">0.0s</div>
          <span class="badge score">✓ <span id="session-score">0/0</span></span>
          <span class="badge streak">🔥 <span id="session-streak">${Stats.getAll().currentStreak}</span></span>
          ${showBest}
        </div>
      </div>
      ${currentModule === 'multiplication' ? '<div class="table-selector" id="table-selector"></div>' : ''}
      ${currentModule !== 'multiplication' ? '<div class="difficulty-bar" id="difficulty-bar"></div>' : ''}
    `;

    if (isBrowser) {
      // Two-column layout: sidebar + question area
      html += `
        <div class="browser-layout">
          <aside class="question-sidebar" id="question-sidebar"></aside>
          <main class="question-main">
            <div id="question-area"></div>
            <div class="browser-nav" id="browser-nav"></div>
          </main>
        </div>
      `;
    } else {
      html += `<div id="question-area"></div>`;
    }

    html += `
      <div class="btn-group" style="margin-top:16px">
        <button class="btn btn-outline btn-sm" onclick="App.endSession()">← Back to Dashboard</button>
      </div>
    `;

    el.innerHTML = html;

    if (currentModule === 'multiplication') renderTableSelector();
    if (currentModule === 'arithmetic' || currentModule === 'percentages' || currentModule === 'speedRecognition' || currentModule === 'memoryChunking' || currentModule === 'visualSpatial') renderDifficultyBar();
    if (currentModule === 'wordProblems') renderWPDifficultyBar();
    if (currentModule === 'brainTeasers') renderBTCategoryBar();
    if (BROWSER_MODULES.includes(currentModule) && currentModule !== 'wordProblems' && currentModule !== 'brainTeasers') renderGenericDifficultyBar();
  }

  function renderTableSelector() {
    const el = getEl('table-selector');
    if (!el) return;
    let html = '<span style="font-size:0.85rem;color:var(--text-light);margin-right:8px">Tables:</span>';
    for (let i = 2; i <= 12; i++) {
      html += `<button class="table-btn ${multTables.includes(i)?'active':''}" onclick="App.toggleTable(${i})">${i}</button>`;
    }
    el.innerHTML = html;
  }

  function renderDifficultyBar() {
    const el = getEl('difficulty-bar');
    if (!el) return;
    const diffMap = {arithmetic:arithDifficulty, percentages:pctDifficulty, speedRecognition:srDifficulty, memoryChunking:mcDifficulty, visualSpatial:vsDifficulty};
    const diff = diffMap[currentModule] || 'easy';
    el.innerHTML = ['easy','medium','hard'].map(d =>
      `<button class="diff-btn ${d===diff?'active':''}" onclick="App.setDifficulty('${d}')">${d[0].toUpperCase()+d.slice(1)}</button>`
    ).join('');
  }

  function renderWPDifficultyBar() {
    const el = getEl('difficulty-bar');
    if (!el) return;
    el.innerHTML = ['all','easy','medium','hard'].map(d =>
      `<button class="diff-btn ${d===wpDifficulty?'active':''}" onclick="App.setWPDifficulty('${d}')">${d==='all'?'All':d[0].toUpperCase()+d.slice(1)}</button>`
    ).join('');
  }

  function renderBTCategoryBar() {
    const el = getEl('difficulty-bar');
    if (!el) return;
    const cats = [
      {key:'all',label:'All'},{key:'balanceScale',label:'Balance Scale'},{key:'numberPattern',label:'Patterns'},
      {key:'logic',label:'Logic'},{key:'lateral',label:'Lateral'},{key:'truthLiar',label:'Truth/Liar'},
      {key:'cryptarithmetic',label:'Cryptarithmetic'},{key:'clockPuzzle',label:'Clock'},{key:'agePuzzle',label:'Age'},
      {key:'probabilityParadox',label:'Paradox'},{key:'gameStrategy',label:'Game'},{key:'geometric',label:'Geometric'},{key:'riverCrossing',label:'River'},
    ];
    el.innerHTML = cats.map(c =>
      `<button class="diff-btn ${c.key===btCategory?'active':''}" onclick="App.setBTCategory('${c.key}')">${c.label}</button>`
    ).join('');
  }

  function renderGenericDifficultyBar() {
    const el = getEl('difficulty-bar');
    if (!el) return;
    const diffMap = {numberTheory:ntDifficulty,estimation:estDifficulty,dataSufficiency:dsDifficulty,errorDetection:edDifficulty,fastQuant:fqDifficulty,quantStrategy:qsDifficulty,constraintDeduction:cdDifficulty,mimQuant:mqDifficulty,dataInsights:diDifficulty,criticalReasoning:crDifficulty,riddles:rdDifficulty};
    const diff = diffMap[currentModule] || 'all';
    el.innerHTML = ['all','easy','medium','hard'].map(d =>
      `<button class="diff-btn ${d===diff?'active':''}" onclick="App.setGenericDifficulty('${d}')">${d==='all'?'All':d[0].toUpperCase()+d.slice(1)}</button>`
    ).join('');
  }

  function setGenericDifficulty(d) {
    switch(currentModule) {
      case 'numberTheory': ntDifficulty=d; break;
      case 'estimation': estDifficulty=d; break;
      case 'dataSufficiency': dsDifficulty=d; break;
      case 'errorDetection': edDifficulty=d; break;
      case 'fastQuant': fqDifficulty=d; break;
      case 'quantStrategy': qsDifficulty=d; break;
      case 'constraintDeduction': cdDifficulty=d; break;
      case 'mimQuant': mqDifficulty=d; break;
      case 'dataInsights': diDifficulty=d; break;
      case 'criticalReasoning': crDifficulty=d; break;
      case 'riddles': rdDifficulty=d; break;
    }
    renderGenericDifficultyBar();
    rebuildPool();
    if (questionPool.length > 0) goToQuestion(0);
  }

  // ── QUESTION BROWSER (sidebar) ──
  function rebuildPool() {
    let all = [];
    switch (currentModule) {
      case 'wordProblems':
        all = Questions.getAllWordProblems();
        if (wpDifficulty !== 'all') all = all.filter(q => q.difficulty === wpDifficulty);
        break;
      case 'brainTeasers':
        all = Questions.getAllBrainTeasers();
        if (btCategory !== 'all') all = all.filter(q => q.category === btCategory);
        break;
      case 'numberTheory':
        all = Questions.getAllNumberTheory();
        if (ntDifficulty !== 'all') all = all.filter(q => q.difficulty === ntDifficulty);
        break;
      case 'estimation':
        all = Questions.getAllEstimation();
        if (estDifficulty !== 'all') all = all.filter(q => q.difficulty === estDifficulty);
        break;
      case 'dataSufficiency':
        all = Questions.getAllDataSufficiency();
        if (dsDifficulty !== 'all') all = all.filter(q => q.difficulty === dsDifficulty);
        break;
      case 'errorDetection':
        all = Questions.getAllErrorDetection();
        if (edDifficulty !== 'all') all = all.filter(q => q.difficulty === edDifficulty);
        break;
      case 'fastQuant':
        all = Questions.getAllFastQuant();
        if (fqDifficulty !== 'all') all = all.filter(q => q.difficulty === fqDifficulty);
        break;
      case 'quantStrategy':
        all = Questions.getAllQuantStrategy();
        if (qsDifficulty !== 'all') all = all.filter(q => q.difficulty === qsDifficulty);
        break;
      case 'constraintDeduction':
        all = Questions.getAllConstraintDeduction();
        if (cdDifficulty !== 'all') all = all.filter(q => q.difficulty === cdDifficulty);
        break;
      case 'mimQuant':
        all = Questions.getAllMimQuant();
        if (mqDifficulty !== 'all') all = all.filter(q => q.difficulty === mqDifficulty);
        break;
      case 'dataInsights':
        all = Questions.getAllDataInsights();
        if (diDifficulty !== 'all') all = all.filter(q => q.difficulty === diDifficulty);
        break;
      case 'criticalReasoning':
        all = Questions.getAllCriticalReasoning();
        if (crDifficulty !== 'all') all = all.filter(q => q.difficulty === crDifficulty);
        break;
      case 'riddles':
        all = Questions.getAllRiddles();
        if (rdDifficulty !== 'all') all = all.filter(q => q.difficulty === rdDifficulty);
        break;
    }
    questionPool = all;
    questionIndex = -1;
  }

  function renderSidebar() {
    const el = getEl('question-sidebar');
    if (!el) return;
    const total = questionPool.length;
    const done = questionPool.filter(q => completedIds.has(q.id)).length;

    let html = `<div class="sidebar-header">${done}/${total} completed</div><ul class="sidebar-list">`;
    questionPool.forEach((q, i) => {
      const isDone = completedIds.has(q.id);
      const isCurrent = i === questionIndex;
      const preview = q.text.length > 45 ? q.text.slice(0, 42) + '…' : q.text;
      html += `<li class="sidebar-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}" onclick="App.goToQuestion(${i})" title="${esc(q.text)}">
        <span class="sidebar-num">${i+1}</span>
        <span class="sidebar-status">${isDone ? '✓' : '○'}</span>
        <span class="sidebar-text">${esc(preview)}</span>
      </li>`;
    });
    html += '</ul>';
    el.innerHTML = html;

    // Scroll current into view
    requestAnimationFrame(() => {
      const cur = el.querySelector('.sidebar-item.current');
      if (cur) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function renderBrowserNav() {
    const el = getEl('browser-nav');
    if (!el) return;
    const total = questionPool.length;
    el.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="App.prevQuestion()" ${questionIndex <= 0 ? 'disabled' : ''}>← Previous</button>
      <span class="browser-pos">${questionIndex+1} / ${total}</span>
      <button class="btn btn-outline btn-sm" onclick="App.nextBrowserQuestion()" ${questionIndex >= total-1 ? 'disabled' : ''}>Next →</button>
    `;
  }

  function goToQuestion(idx) {
    if (idx < 0 || idx >= questionPool.length) return;
    answered = false;
    if (stopwatchInterval) stopStopwatch();
    questionIndex = idx;
    currentQuestion = questionPool[idx];
    renderSidebar();
    renderQuestion(currentQuestion);
    renderBrowserNav();
    startStopwatch();
  }

  function prevQuestion() { goToQuestion(questionIndex - 1); }
  function nextBrowserQuestion() { goToQuestion(questionIndex + 1); }

  // ── QUESTION FLOW ──
  function nextQuestion() {
    if (!currentModule) return;
    answered = false;
    let q;
    switch (currentModule) {
      case 'multiplication': q = Questions.getMultiplication(multTables); break;
      case 'arithmetic':     q = Questions.getArithmetic(arithDifficulty); break;
      case 'percentages':    q = Questions.getPercentage(pctDifficulty); break;
      case 'wordProblems':   q = Questions.getWordProblem(wpDifficulty); break;
      case 'brainTeasers':   q = Questions.getBrainTeaser(btCategory); break;
      case 'speedRecognition': q = Questions.getSpeedRecognition(srDifficulty); break;
      case 'memoryChunking':   q = Questions.getMemoryChunking(mcDifficulty); break;
      case 'visualSpatial':    q = Questions.getVisualSpatial(vsDifficulty); break;
    }
    if (!q) return;
    currentQuestion = q;
    renderQuestion(q);
    startStopwatch();
  }

  /** Render optional image, SVG diagram, or HTML table for a question */
  function renderQuestionMedia(q) {
    let html = '';
    if (q.image) {
      html += `<div class="question-media"><img src="${esc(q.image)}" alt="Diagram" loading="lazy"></div>`;
    }
    if (q.svg) {
      html += `<div class="question-media">${q.svg}</div>`;
    }
    if (q.tableData) {
      html += `<div class="question-media"><table class="question-table">`;
      q.tableData.forEach((row, ri) => {
        const tag = ri === 0 ? 'th' : 'td';
        html += '<tr>' + row.map(cell => `<${tag}>${esc(String(cell))}</${tag}>`).join('') + '</tr>';
      });
      html += '</table></div>';
    }
    return html;
  }

  function renderQuestion(q) {
    const area = getEl('question-area');
    if (!area) return;
    if (q.type === 'memory') {
      // Show expression for a few seconds, then hide
      const showTime = {easy:4000, medium:3000, hard:2000}[q.meta?.difficulty] || 3000;
      area.innerHTML = `
        <div class="question-card memory-card">
          <div class="memory-phase" id="memory-phase">
            <p class="memory-label">Memorize this expression:</p>
            <div class="memory-expression" id="memory-expr">${esc(q.text)}</div>
            <div class="memory-timer" id="memory-timer">${Math.ceil(showTime/1000)}s</div>
          </div>
        </div>`;
      let remaining = showTime;
      const timerEl = document.getElementById('memory-timer');
      const countdown = setInterval(() => {
        remaining -= 100;
        if (timerEl) timerEl.textContent = (remaining/1000).toFixed(1) + 's';
        if (remaining <= 0) {
          clearInterval(countdown);
          area.innerHTML = `
            <div class="question-card memory-card">
              <div class="memory-phase solve-phase">
                <p class="memory-label">Expression hidden — solve from memory:</p>
                <div class="answer-input-wrap">
                  <input type="text" inputmode="decimal" class="answer-input" id="answer-input"
                    autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                    onkeydown="if(event.key==='Enter')App.submitInput()">
                  <button class="btn btn-primary" onclick="App.submitInput()">Submit</button>
                </div>
              </div>
            </div>`;
        }
      }, 100);
    } else if (q.choices) {
      const isLong = q.text.length > 100;
      area.innerHTML = `
        <div class="question-card">
          ${renderQuestionMedia(q)}
          <div class="question-text ${isLong ? 'small' : ''}">${esc(q.text)}</div>
          <div class="choices" id="choices">
            ${q.choices.map((c,i) => `<button class="choice-btn" data-idx="${i}" onclick="App.submitChoice(${i})">${esc(c)}</button>`).join('')}
          </div>
        </div>`;
    } else {
      area.innerHTML = `
        <div class="question-card">
          ${renderQuestionMedia(q)}
          <div class="question-text">${esc(q.text)}</div>
          <div class="answer-input-wrap">
            <input type="text" inputmode="decimal" class="answer-input" id="answer-input"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
              onkeydown="if(event.key==='Enter')App.submitInput()">
            <button class="btn btn-primary" onclick="App.submitInput()">Submit</button>
          </div>
        </div>`;
      if (!('ontouchstart' in window)) {
        setTimeout(() => { const inp = getEl('answer-input'); if (inp) inp.focus(); }, 50);
      }
    }
  }

  // ── SUBMIT ANSWERS ──
  function submitInput() {
    if (answered) return;
    answered = true;
    const timeMs = stopStopwatch();
    const input = getEl('answer-input');
    if (!input) return;
    const userAns = input.value.trim();
    const correct = String(currentQuestion.correctAnswer);
    const ok = checkAnswer(userAns, correct);
    input.disabled = true;
    input.classList.add(ok ? 'correct' : 'wrong');
    recordAnswer(ok, userAns, correct, timeMs);
    showExplanation(ok, correct, timeMs);
  }

  function submitChoice(idx) {
    if (answered) return;
    answered = true;
    const timeMs = stopStopwatch();
    const correct = currentQuestion.correct;
    const ok = idx === correct;
    (getEl('question-area') || document.body).querySelectorAll('.choice-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      if (i === idx && !ok) btn.classList.add('wrong');
    });
    recordAnswer(ok, currentQuestion.choices[idx], currentQuestion.choices[correct], timeMs);
    showExplanation(ok, currentQuestion.choices[correct], timeMs);
  }

  function checkAnswer(user, correct) {
    const u = user.replace(/\s/g,'').toLowerCase();
    const c = correct.replace(/\s/g,'').toLowerCase();
    if (u === c) return true;
    const uN = parseFloat(u), cN = parseFloat(c);
    return !isNaN(uN) && !isNaN(cN) && Math.abs(uN - cN) < 0.01;
  }

  function recordAnswer(ok, userAns, correctAns, timeMs) {
    sessionTotal++;
    if (ok) sessionCorrect++;
    sessionTimes.push(timeMs);
    Stats.record(currentModule, currentQuestion.text, userAns, correctAns, ok, timeMs);
    // Mark question as completed in browser
    if (currentQuestion.id) { completedIds.add(currentQuestion.id); saveCompleted(); }
    updateSessionUI();
    // Update sidebar if in browser mode
    if (isBrowserModule(currentModule) && getEl('question-sidebar')) {
      renderSidebar();
    }
  }

  function updateSessionUI() {
    const s = getEl('session-score');
    const st = getEl('session-streak');
    if (s) s.textContent = `${sessionCorrect}/${sessionTotal}`;
    if (st) st.textContent = Stats.getAll().currentStreak;
  }

  // ── EXPLANATION MODAL ──
  function showExplanation(ok, correctAns, timeMs) {
    // Speed modules: auto-advance on correct, only show modal on wrong
    if (ok && SPEED_MODULES.includes(currentModule)) {
      setTimeout(() => nextQuestion(), 300);
      return;
    }
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');
    let trickHtml = '';
    if (currentQuestion.meta) {
      const tricks = Tricks.getRelevant(currentQuestion.meta.module || currentModule, currentQuestion.meta);
      if (tricks.length > 0) {
        trickHtml = tricks.map(t => `
          <div class="explanation-block">
            <span class="trick-tag">💡 Math Trick</span>
            <h4>${esc(t.title)}</h4><p>${esc(t.rule)}</p>
            <p><strong>Example:</strong> ${esc(t.example)}</p>
            <p style="color:var(--text-light);font-size:0.82rem"><em>When: ${esc(t.when)}</em></p>
          </div>`).join('');
      }
    }
    const expl = currentQuestion.explanation || '';
    const isBrowser = isBrowserModule(currentModule) && questionPool.length > 0;
    const hasNext = isBrowser ? questionIndex < questionPool.length - 1 : true;

    modal.innerHTML = `
      <div class="result-icon ${ok?'correct':'wrong'}">${ok?'✓':'✗'}</div>
      <h3>${ok?'Correct!':'Incorrect'}</h3>
      ${!ok ? `<div class="correct-answer">Correct answer: ${esc(String(correctAns))}</div>` : ''}
      <p style="margin-bottom:16px">Time: <strong>${formatStopwatch(timeMs)}</strong></p>
      ${expl ? `<div class="explanation-block"><h4>Step-by-Step Solution</h4><p style="white-space:pre-line">${esc(expl)}</p></div>` : ''}
      ${trickHtml}
      <div class="btn-group">
        <button class="btn btn-primary" onclick="App.closeModalAndNext()">${hasNext ? 'Next Question →' : 'Done'}</button>
      </div>
    `;
    overlay.classList.add('active');
  }

  function closeModalAndNext() {
    document.getElementById('modal-overlay').classList.remove('active');
    if (!currentModule) return;
    const isBrowser = isBrowserModule(currentModule) && questionPool.length > 0;
    if (isBrowser) {
      if (questionIndex < questionPool.length - 1) {
        goToQuestion(questionIndex + 1);
      }
      // else stay on current (last question)
    } else if (getEl('question-area')) {
      nextQuestion();
    }
  }

  // ── END SESSION ──
  function endSession() {
    if (stopwatchInterval) stopStopwatch();
    if (sessionTotal > 0) {
      const avg = sessionTimes.reduce((a,b) => a+b, 0) / sessionTimes.length;
      Stats.saveSession(currentModule, sessionCorrect, sessionTotal, avg);
    }
    currentModule = null;
    questionPool = [];
    questionIndex = -1;
    navigate('dashboard');
  }

  // ── SETTINGS ──
  function toggleTable(n) {
    const idx = multTables.indexOf(n);
    if (idx >= 0) { if (multTables.length > 1) multTables.splice(idx, 1); }
    else multTables.push(n);
    renderTableSelector();
  }
  function setDifficulty(d) {
    if (currentModule==='arithmetic') arithDifficulty=d;
    if (currentModule==='percentages') pctDifficulty=d;
    if (currentModule==='speedRecognition') srDifficulty=d;
    if (currentModule==='memoryChunking') mcDifficulty=d;
    if (currentModule==='visualSpatial') vsDifficulty=d;
    renderDifficultyBar();
    nextQuestion();
  }
  function setWPDifficulty(d) {
    wpDifficulty = d;
    renderWPDifficultyBar();
    rebuildPool();
    if (questionPool.length > 0) goToQuestion(0);
  }
  function setBTCategory(c) {
    btCategory = c;
    renderBTCategoryBar();
    rebuildPool();
    if (questionPool.length > 0) goToQuestion(0);
  }

  // ── TRICKS REFERENCE ──
  function renderTricks() {
    const el = document.getElementById('view-tricks');
    const allTricks = Tricks.getAll();
    const categories = {
      multiplication:'Multiplication Shortcuts', arithmetic:'Division & Arithmetic',
      percentages:'Percentages & Fractions', wordProblems:'Word Problem Strategies',
      brainTeasers:'Brain Teaser Strategies',
    };
    let html = '<h2 style="margin-bottom:16px">Math Tricks Reference</h2>';
    html += '<p style="color:var(--text-light);margin-bottom:20px">Quick reference of all mental math shortcuts and GMAT strategies.</p>';
    for (const [cat, title] of Object.entries(categories)) {
      const tricks = allTricks.filter(t => t.category === cat);
      if (!tricks.length) continue;
      html += `<h3 style="margin:20px 0 12px">${title}</h3><ul class="tricks-list">`;
      for (const t of tricks) {
        html += `<li class="trick-item"><h4>${esc(t.title)}</h4><p>${esc(t.rule)}</p><div class="trick-example">${esc(t.example)}</div><p style="color:var(--text-light);font-size:0.82rem;margin-top:4px"><em>${esc(t.when)}</em></p></li>`;
      }
      html += '</ul>';
    }
    el.innerHTML = html;
  }

  // ── LEARN ──
  function renderLearn() {
    const el = document.getElementById('view-learn');
    if (!el) return;
    el.innerHTML = `
<h2 style="margin-bottom:6px">GMAT Focus Edition — Study Guide</h2>
<p style="color:var(--text-light);margin-bottom:20px">Conceptos clave, fórmulas y estrategias para el examen GMAT.</p>
<div class="learn-tabs" id="learn-tabs">
  <button class="learn-tab active" data-tab="structure">Estructura</button>
  <button class="learn-tab" data-tab="formulas">Fórmulas</button>
  <button class="learn-tab" data-tab="ds">Data Suf.</button>
  <button class="learn-tab" data-tab="cr">C. Reasoning</button>
  <button class="learn-tab" data-tab="strategy">Estrategia</button>
</div>

<div id="learn-panel-structure" class="learn-panel active">
  <h3 class="learn-section-title">Estructura del examen</h3>
  <table class="learn-table">
    <thead><tr><th>Sección</th><th>Preguntas</th><th>Tiempo</th><th>Tipos</th></tr></thead>
    <tbody>
      <tr><td>Quantitative Reasoning</td><td>21</td><td>45 min</td><td>Problem Solving, Data Sufficiency</td></tr>
      <tr><td>Verbal Reasoning</td><td>23</td><td>45 min</td><td>Critical Reasoning, Reading Comprehension</td></tr>
      <tr><td>Data Insights</td><td>20</td><td>45 min</td><td>Data Sufficiency, Multi-Source, Table Analysis, Graphics</td></tr>
    </tbody>
  </table>
  <h3 class="learn-section-title" style="margin-top:20px">Puntuación</h3>
  <ul class="learn-list">
    <li><strong>Puntuación total:</strong> 205–805 (incrementos de 10)</li>
    <li><strong>Cada sección:</strong> 60–90 puntos</li>
    <li><strong>Adaptativo:</strong> computer-adaptive dentro de cada sección</li>
    <li><strong>Sin penalización:</strong> las respuestas incorrectas no restan — responde siempre</li>
    <li><strong>Sin saltar preguntas:</strong> cada pregunta debe responderse antes de continuar</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Gestión del tiempo</h3>
  <ul class="learn-list">
    <li>Quant: ~2 min 9 seg por pregunta (21 preguntas / 45 min)</li>
    <li>Verbal: ~1 min 57 seg por pregunta</li>
    <li>Data Insights: ~2 min 15 seg por pregunta</li>
    <li>Sacrifica las preguntas difíciles para proteger tiempo en las fáciles</li>
    <li>Pasa a la siguiente si llevas más de 2,5 minutos atascado</li>
  </ul>
</div>

<div id="learn-panel-formulas" class="learn-panel">
  <h3 class="learn-section-title">Propiedades numéricas</h3>
  <ul class="learn-list">
    <li><strong>Par × Par = Par | Par × Impar = Par | Impar × Impar = Impar</strong></li>
    <li><strong>Divisible por 2:</strong> último dígito par</li>
    <li><strong>Divisible por 3:</strong> suma de dígitos divisible por 3</li>
    <li><strong>Divisible por 4:</strong> últimas dos cifras divisibles por 4</li>
    <li><strong>Divisible por 9:</strong> suma de dígitos divisible por 9</li>
    <li><strong>Primos &lt; 30:</strong> 2, 3, 5, 7, 11, 13, 17, 19, 23, 29</li>
    <li><strong>MCD × MCM = a × b</strong> (para dos números a, b)</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Porcentajes y razones</h3>
  <ul class="learn-list">
    <li><strong>% de cambio:</strong> (Nuevo − Viejo) / Viejo × 100</li>
    <li><strong>Cambios sucesivos:</strong> multiplica factores (no sumes)</li>
    <li><strong>Markup y descuento:</strong> precio final = coste × (1+m)(1−d)</li>
    <li><strong>Partes:</strong> si a:b = 3:5 → a = 3/(3+5) del total</li>
    <li><strong>1/8 = 12,5% | 1/6 ≈ 16,7% | 1/3 ≈ 33,3% | 3/8 = 37,5%</strong></li>
    <li><strong>1/7 ≈ 14,3% | 2/7 ≈ 28,6% | 3/7 ≈ 42,9%</strong></li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Geometría</h3>
  <ul class="learn-list">
    <li><strong>Círculo:</strong> Área = πr² | Perímetro = 2πr</li>
    <li><strong>Triángulo:</strong> Área = ½ × base × altura</li>
    <li><strong>Ternas pitagóricas:</strong> 3-4-5 | 5-12-13 | 8-15-17</li>
    <li><strong>30-60-90:</strong> lados x : x√3 : 2x</li>
    <li><strong>45-45-90:</strong> lados x : x : x√2</li>
    <li><strong>Cilindro:</strong> V = πr²h | SA = 2πr² + 2πrh</li>
    <li><strong>Suma de ángulos interiores:</strong> (n−2) × 180°</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Estadística</h3>
  <ul class="learn-list">
    <li><strong>Media:</strong> suma / cantidad</li>
    <li><strong>Mediana:</strong> valor central al ordenar</li>
    <li><strong>Moda:</strong> valor más frecuente</li>
    <li><strong>Rango:</strong> máx − mín</li>
    <li><strong>DS:</strong> si multiplicas cada valor por c → DS × c | si sumas constante → DS no cambia</li>
    <li><strong>Varianza</strong> = DS²</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Probabilidad y combinatoria</h3>
  <ul class="learn-list">
    <li><strong>P(A y B)</strong> = P(A) × P(B) [independientes]</li>
    <li><strong>P(A o B)</strong> = P(A) + P(B) − P(A y B)</li>
    <li><strong>P(al menos uno)</strong> = 1 − P(ninguno)</li>
    <li><strong>Combinaciones:</strong> C(n,k) = n! / (k!(n−k)!)</li>
    <li><strong>Permutaciones:</strong> P(n,k) = n! / (n−k)!</li>
  </ul>
</div>

<div id="learn-panel-ds" class="learn-panel">
  <h3 class="learn-section-title">Data Sufficiency — Las 5 opciones</h3>
  <div class="ds-choices">
    <div class="ds-choice"><span class="ds-letter">A</span><p>El enunciado (1) SOLO es suficiente, pero el (2) no.</p></div>
    <div class="ds-choice"><span class="ds-letter">B</span><p>El enunciado (2) SOLO es suficiente, pero el (1) no.</p></div>
    <div class="ds-choice"><span class="ds-letter">C</span><p>AMBOS enunciados JUNTOS son suficientes, pero NINGUNO solo lo es.</p></div>
    <div class="ds-choice"><span class="ds-letter">D</span><p>CADA enunciado SOLO es suficiente.</p></div>
    <div class="ds-choice"><span class="ds-letter">E</span><p>Los enunciados (1) y (2) JUNTOS NO son suficientes.</p></div>
  </div>
  <h3 class="learn-section-title" style="margin-top:20px">Árbol de decisión</h3>
  <ul class="learn-list">
    <li><strong>Paso 1 — Prueba (1) solo:</strong> suficiente → A o D | no suficiente → B, C o E</li>
    <li><strong>Paso 2 — Prueba (2) solo:</strong><br>Si (1) fue suficiente: (2) suficiente → D | no → A<br>Si (1) no fue suficiente: (2) suficiente → B | no suficiente → C o E</li>
    <li><strong>Paso 3 — Prueba ambos juntos:</strong> suficiente → C | no suficiente → E</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Reglas clave</h3>
  <ul class="learn-list">
    <li>No necesitas calcular la respuesta exacta — solo determinar si es posible hacerlo</li>
    <li>En preguntas SÍ/NO: suficiente = siempre SÍ o siempre NO</li>
    <li>No asumas enteros a menos que se diga; prueba fracciones y negativos</li>
    <li>Dos ecuaciones consistentes ≠ solución única si hay infinitas soluciones</li>
    <li>Nemotécnico: <strong>AD/BCE</strong> — elimina en grupos</li>
  </ul>
</div>

<div id="learn-panel-cr" class="learn-panel">
  <h3 class="learn-section-title">Tipos de pregunta</h3>
  <table class="learn-table">
    <thead><tr><th>Tipo</th><th>Palabras clave en el enunciado</th><th>Busca</th></tr></thead>
    <tbody>
      <tr><td><strong>Strengthen</strong></td><td>most supports, strengthens</td><td>Evidencia adicional para la conclusión</td></tr>
      <tr><td><strong>Weaken</strong></td><td>most seriously weakens, undermines</td><td>Causa alternativa o contraejemplo</td></tr>
      <tr><td><strong>Assumption</strong></td><td>assumes, depends on, relies on</td><td>Brecha necesaria entre premisa y conclusión</td></tr>
      <tr><td><strong>Inference</strong></td><td>must be true, can be concluded</td><td>Lo que se sigue lógicamente del texto</td></tr>
      <tr><td><strong>Flaw</strong></td><td>vulnerable to criticism, flawed because</td><td>Error lógico en el argumento</td></tr>
      <tr><td><strong>Evaluate</strong></td><td>most useful to determine</td><td>Información que cambiaría la respuesta</td></tr>
      <tr><td><strong>Boldface</strong></td><td>boldface portions play which roles</td><td>Premisa vs. conclusión vs. contrapunto</td></tr>
    </tbody>
  </table>
  <h3 class="learn-section-title" style="margin-top:20px">El proceso CR</h3>
  <ul class="learn-list">
    <li><strong>1. Identifica la conclusión</strong> — ¿Qué está afirmando el autor?</li>
    <li><strong>2. Identifica las premisas</strong> — ¿Qué evidencia la apoya?</li>
    <li><strong>3. Identifica el gap</strong> — ¿Qué asunción conecta premisas y conclusión?</li>
    <li><strong>4. Pre-piensa la respuesta</strong> — ¿Qué fortalecería/debilitaría/asumiría?</li>
    <li><strong>5. Elimina</strong> — fuera de alcance, lenguaje extremo, dirección invertida</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Trampas comunes</h3>
  <ul class="learn-list">
    <li><strong>Causalidad inversa:</strong> A causa B vs B causa A</li>
    <li><strong>Correlación ≠ Causalidad:</strong> pueden tener una causa común</li>
    <li><strong>Lenguaje extremo:</strong> "siempre", "nunca", "todos" — normalmente incorrecto</li>
    <li><strong>Fuera de alcance:</strong> hecho correcto pero irrelevante para el argumento</li>
    <li><strong>Dirección correcta, argumento incorrecto:</strong> fortalece cuando necesitas debilitar</li>
  </ul>
</div>

<div id="learn-panel-strategy" class="learn-panel">
  <h3 class="learn-section-title">Estrategia general</h3>
  <ul class="learn-list">
    <li><strong>Lee toda la pregunta</strong> antes de mirar las opciones</li>
    <li><strong>Elimina respuestas incorrectas</strong> sistemáticamente en lugar de buscar la correcta</li>
    <li><strong>Números inteligentes:</strong> usa 100 para porcentajes, enteros fáciles para álgebra</li>
    <li><strong>Backsolving:</strong> empieza con la opción C (o B), prueba si funciona</li>
    <li><strong>Estimación:</strong> si las opciones difieren en &gt;10%, estima en lugar de calcular exacto</li>
    <li><strong>Nunca dejes en blanco:</strong> al azar = 20% de acierto; elimina 2 → 33%</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Errores frecuentes en Quant</h3>
  <ul class="learn-list">
    <li>Asumir que las variables son enteros positivos cuando no se especifica</li>
    <li>Confundir preguntas de resto (el resto siempre es ≥ 0 y &lt; divisor)</li>
    <li>Olvidar que √x² = |x|, no necesariamente x</li>
    <li>Cambios sucesivos de %: subir 20% y bajar 20% ≠ 0% de cambio neto</li>
    <li>Velocidad media ≠ (v1 + v2) / 2 para distancias iguales</li>
    <li>No probar x = 0, negativos y fracciones en desigualdades</li>
  </ul>
  <h3 class="learn-section-title" style="margin-top:20px">Consejos para MiM/MiF</h3>
  <ul class="learn-list">
    <li>Los programas valoran mucho el GMAT junto con el GPA y experiencia laboral</li>
    <li>Objetivo: 650+ para MiM, 680+ para MiF en las mejores escuelas</li>
    <li>La sección Quant importa especialmente — practica hasta el percentil 80+</li>
    <li>Data Insights es la sección más nueva — relativamente más fácil de mejorar</li>
    <li>Las repeticiones son habituales y aceptadas; la mayoría de escuelas toma la mejor nota</li>
  </ul>
</div>`;
    // Tab switching
    el.querySelectorAll('.learn-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.learn-tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.learn-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('learn-panel-' + tab.dataset.tab).classList.add('active');
      });
    });
  }

  // ── REVIEW MISTAKES ──
  function renderReview() {
    const el = document.getElementById('view-review');
    const mistakes = Stats.getAllMistakes();
    let html = '<h2 style="margin-bottom:16px">Review Mistakes</h2>';
    if (!mistakes.length) {
      html += '<p style="color:var(--text-light)">No mistakes yet! Start practicing.</p>';
      el.innerHTML = html; return;
    }
    const labels = { multiplication:'Multiplication', arithmetic:'Arithmetic', percentages:'Percentages', wordProblems:'Word Problems', brainTeasers:'Brain Teasers', numberTheory:'Number Theory', estimation:'Estimation', dataSufficiency:'Data Sufficiency', errorDetection:'Error Detection', fastQuant:'Fast Quant', quantStrategy:'Quant Strategy', constraintDeduction:'Constraint Deduction', speedRecognition:'Speed Recognition', memoryChunking:'Memory & Chunking', visualSpatial:'Visual-Spatial', mimQuant:'MiM Quant', dataInsights:'Data Insights', criticalReasoning:'Critical Reasoning', riddles:'Riddles', examSim:'Exam Simulation' };
    html += `<p style="color:var(--text-light);margin-bottom:16px">${mistakes.length} mistake(s). Most recent first.</p>`;
    html += '<table class="mistakes-table"><thead><tr><th>Module</th><th>Question</th><th>Your Answer</th><th>Correct</th><th>Time</th><th>Date</th></tr></thead><tbody>';
    for (const m of mistakes.slice(0, 50)) {
      html += `<tr>
        <td>${labels[m.module]||m.module}</td>
        <td style="max-width:350px;white-space:pre-line;word-break:break-word">${esc(m.question)}</td>
        <td style="color:var(--danger)">${esc(m.userAnswer)}</td>
        <td style="color:var(--success)">${esc(m.correctAnswer)}</td>
        <td>${Stats.formatTime(m.timeMs)}</td>
        <td>${new Date(m.date).toLocaleDateString()}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ── EXAM SIMULATION ──
  let examState = null;

  function renderExamSetup() {
    const el = document.getElementById('view-examSim');
    if (!el) return;
    el.innerHTML = `
      <h2 style="margin-bottom:6px">📝 Mock Exam</h2>
      <p style="color:var(--text-light);margin-bottom:20px">Configure and take a practice exam under timed conditions.</p>
      <div class="exam-setup-card">
        <h3>Select Sections</h3>
        <div class="exam-section-checks">
          <label class="exam-check"><input type="checkbox" id="exam-quant" checked> <span>Quantitative Reasoning</span> <small>Problem Solving & Data Sufficiency</small></label>
          <label class="exam-check"><input type="checkbox" id="exam-di" checked> <span>Data Insights</span> <small>Tables, charts & multi-source</small></label>
          <label class="exam-check"><input type="checkbox" id="exam-cr" checked> <span>Critical Reasoning</span> <small>Logical arguments & assumptions</small></label>
          <label class="exam-check"><input type="checkbox" id="exam-verbal" checked> <span>Verbal / Word Problems</span> <small>Reading comprehension style</small></label>
        </div>
        <h3 style="margin-top:20px">Exam Length</h3>
        <div class="exam-length-options">
          <button class="diff-btn active" data-len="mini" onclick="App.setExamLength(this)">Mini (15 Qs / 20 min)</button>
          <button class="diff-btn" data-len="half" onclick="App.setExamLength(this)">Half (30 Qs / 40 min)</button>
          <button class="diff-btn" data-len="full" onclick="App.setExamLength(this)">Full (64 Qs / 135 min)</button>
        </div>
        <h3 style="margin-top:20px">Difficulty Mix</h3>
        <div class="exam-length-options">
          <button class="diff-btn" data-diff="easy" onclick="App.setExamDiff(this)">Easy</button>
          <button class="diff-btn active" data-diff="mixed" onclick="App.setExamDiff(this)">Mixed (Realistic)</button>
          <button class="diff-btn" data-diff="hard" onclick="App.setExamDiff(this)">Hard</button>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:24px;padding:14px" onclick="App.startExam()">Start Exam →</button>
      </div>
      <div class="btn-group" style="margin-top:16px">
        <button class="btn btn-outline btn-sm" onclick="App.navigate('dashboard')">← Back to Dashboard</button>
      </div>`;
  }

  function setExamLength(btn) {
    btn.closest('.exam-length-options').querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  function setExamDiff(btn) {
    btn.closest('.exam-length-options').querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function startExam() {
    const el = document.getElementById('view-examSim');
    const includeQuant = document.getElementById('exam-quant')?.checked;
    const includeDI = document.getElementById('exam-di')?.checked;
    const includeCR = document.getElementById('exam-cr')?.checked;
    const includeVerbal = document.getElementById('exam-verbal')?.checked;

    if (!includeQuant && !includeDI && !includeCR && !includeVerbal) {
      alert('Select at least one section.');
      return;
    }

    const lenBtn = el.querySelector('.exam-length-options .diff-btn.active[data-len]');
    const diffBtn = el.querySelector('.exam-length-options .diff-btn.active[data-diff]');
    const len = lenBtn ? lenBtn.dataset.len : 'mini';
    const diff = diffBtn ? diffBtn.dataset.diff : 'mixed';

    const counts = { mini: 15, half: 30, full: 64 };
    const timeLimits = { mini: 20*60*1000, half: 40*60*1000, full: 135*60*1000 };
    const totalQs = counts[len];
    const timeLimit = timeLimits[len];

    let pool = [];
    if (includeQuant) {
      pool.push(...Questions.getAllMimQuant());
      pool.push(...Questions.getAllNumberTheory());
      pool.push(...Questions.getAllDataSufficiency());
      pool.push(...Questions.getAllEstimation());
    }
    if (includeDI) {
      pool.push(...Questions.getAllDataInsights());
    }
    if (includeCR) {
      pool.push(...Questions.getAllCriticalReasoning());
    }
    if (includeVerbal) {
      pool.push(...Questions.getAllWordProblems());
      pool.push(...Questions.getAllBrainTeasers());
    }

    if (diff === 'easy') pool = pool.filter(q => q.difficulty === 'easy' || q.difficulty === 'medium');
    if (diff === 'hard') pool = pool.filter(q => q.difficulty === 'hard' || q.difficulty === 'medium');

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const questions = pool.slice(0, Math.min(totalQs, pool.length));

    if (questions.length === 0) {
      alert('No questions available for this configuration.');
      return;
    }

    if (questions.length < totalQs) {
      if (!confirm('Only ' + questions.length + ' questions available (requested ' + totalQs + '). Continue anyway?')) return;
    }

    examState = {
      questions,
      index: 0,
      answers: new Array(questions.length).fill(null),
      flagged: new Set(),
      times: new Array(questions.length).fill(0),
      startTime: Date.now(),
      timeLimit,
      timerInterval: null,
      config: { len, diff },
      _qStart: performance.now()
    };

    renderExamQuestion();
  }

  function renderExamQuestion() {
    const el = document.getElementById('view-examSim');
    if (!examState) return;
    const q = examState.questions[examState.index];
    const total = examState.questions.length;
    const idx = examState.index;

    examState._qStart = performance.now();

    let qHtml = '';
    if (q.tableData) {
      qHtml += '<div class="question-media"><table class="question-table">';
      q.tableData.forEach((row, ri) => {
        const tag = ri === 0 ? 'th' : 'td';
        qHtml += '<tr>' + row.map(cell => '<' + tag + '>' + esc(String(cell)) + '</' + tag + '>').join('') + '</tr>';
      });
      qHtml += '</table></div>';
    }
    if (q.svg) qHtml += '<div class="question-media">' + q.svg + '</div>';

    let choicesHtml = '';
    if (q.choices) {
      choicesHtml = '<div class="choices">' +
        q.choices.map((c, i) => {
          const selected = examState.answers[idx] === i;
          return '<button class="choice-btn exam-choice' + (selected ? ' selected' : '') + '" data-idx="' + i + '" onclick="App.examSelectChoice(' + i + ')">' + esc(c) + '</button>';
        }).join('') + '</div>';
    }

    const flagged = examState.flagged.has(idx);

    el.innerHTML = `
      <div class="exam-topbar">
        <div class="exam-timer" id="exam-timer">--:--</div>
        <div class="exam-progress">${idx+1} / ${total}</div>
        <button class="btn btn-outline btn-sm exam-flag-btn ${flagged?'flagged':''}" onclick="App.examToggleFlag()">🚩 Flag</button>
      </div>
      <div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${((idx+1)/total)*100}%"></div></div>
      <div class="question-card">
        ${qHtml}
        <div class="question-text ${q.text.length > 100 ? 'small' : ''}">${esc(q.text)}</div>
        ${choicesHtml}
      </div>
      <div class="exam-nav">
        <button class="btn btn-outline btn-sm" onclick="App.examPrev()" ${idx===0?'disabled':''}>← Previous</button>
        ${idx < total - 1
          ? '<button class="btn btn-primary btn-sm" onclick="App.examNext()">Next →</button>'
          : '<button class="btn btn-primary btn-sm" onclick="App.examFinish()" style="background:var(--success)">Finish Exam ✓</button>'
        }
      </div>`;

    if (!examState.timerInterval) {
      examState.timerInterval = setInterval(updateExamTimer, 1000);
    }
    updateExamTimer();
  }

  function updateExamTimer() {
    if (!examState) return;
    const elapsed = Date.now() - examState.startTime;
    const remaining = Math.max(0, examState.timeLimit - elapsed);
    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    const timerEl = document.getElementById('exam-timer');
    if (timerEl) {
      timerEl.textContent = min + ':' + String(sec).padStart(2, '0');
      if (remaining < 120000) timerEl.style.color = 'var(--danger)';
      else if (remaining < 300000) timerEl.style.color = 'var(--warning)';
    }
    if (remaining <= 0) {
      examFinish();
    }
  }

  function examSelectChoice(idx) {
    const qIdx = examState.index;
    examState.answers[qIdx] = idx;
    examState.times[qIdx] = (examState.times[qIdx] || 0) + (performance.now() - examState._qStart);
    examState._qStart = performance.now();
    document.querySelectorAll('.exam-choice').forEach((btn, i) => {
      btn.classList.toggle('selected', i === idx);
    });
  }

  function examToggleFlag() {
    const qIdx = examState.index;
    if (examState.flagged.has(qIdx)) examState.flagged.delete(qIdx);
    else examState.flagged.add(qIdx);
    renderExamQuestion();
  }

  function examPrev() {
    if (!examState || examState.index <= 0) return;
    examState.times[examState.index] = (examState.times[examState.index] || 0) + (performance.now() - examState._qStart);
    examState.index--;
    renderExamQuestion();
  }

  function examNext() {
    if (!examState || examState.index >= examState.questions.length - 1) return;
    examState.times[examState.index] = (examState.times[examState.index] || 0) + (performance.now() - examState._qStart);
    examState.index++;
    renderExamQuestion();
  }

  function examFinish() {
    if (!examState) return;
    examState.times[examState.index] = (examState.times[examState.index] || 0) + (performance.now() - examState._qStart);
    if (examState.timerInterval) { clearInterval(examState.timerInterval); examState.timerInterval = null; }

    const total = examState.questions.length;
    let correct = 0;
    let answered = 0;
    const totalTime = Date.now() - examState.startTime;

    const details = examState.questions.map((q, i) => {
      const userIdx = examState.answers[i];
      const isAnswered = userIdx !== null && userIdx >= 0;
      const isCorrect = isAnswered && userIdx === q.correct;
      if (isAnswered) answered++;
      if (isCorrect) correct++;
      if (isAnswered) {
        Stats.record('examSim', q.text, q.choices[userIdx], q.choices[q.correct], isCorrect, Math.round(examState.times[i]));
      }
      return { q, userIdx, isCorrect, isAnswered, time: examState.times[i] };
    });

    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const avgTime = answered > 0 ? Math.round(details.filter(d => d.isAnswered).reduce((s, d) => s + d.time, 0) / answered) : 0;

    const rawScore = (correct / total) * 100;
    const estScore = Math.round(205 + (rawScore / 100) * 600);

    const el = document.getElementById('view-examSim');
    const reviewHtml = details.map((d, i) => {
      const statusClass = !d.isAnswered ? 'skipped' : d.isCorrect ? 'correct' : 'wrong';
      const statusIcon = !d.isAnswered ? '○' : d.isCorrect ? '✓' : '✗';
      return `<div class="exam-review-item ${statusClass}">
        <span class="exam-review-num">${i+1}. ${statusIcon}</span>
        <span class="exam-review-text">${esc(d.q.text.length > 80 ? d.q.text.slice(0,77)+'…' : d.q.text)}</span>
        <span class="exam-review-time">${Stats.formatTime(Math.round(d.time))}</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <h2 style="margin-bottom:6px">📊 Exam Results</h2>
      <p style="color:var(--text-light);margin-bottom:20px">Exam completed in ${Math.floor(totalTime/60000)} min ${Math.floor((totalTime%60000)/1000)} sec</p>
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-value" style="color:var(--primary)">${estScore}</div><div class="stat-label">Est. Score (approx.)</div></div>
        <div class="stat-card"><div class="stat-value">${correct}/${total}</div><div class="stat-label">Correct</div></div>
        <div class="stat-card"><div class="stat-value">${accuracy}%</div><div class="stat-label">Accuracy</div></div>
        <div class="stat-card"><div class="stat-value">${Stats.formatTime(avgTime)}</div><div class="stat-label">Avg Time</div></div>
      </div>
      <h3 style="margin-bottom:12px">Question Review</h3>
      <div class="exam-review-list">${reviewHtml}</div>
      <div class="btn-group" style="margin-top:24px">
        <button class="btn btn-primary" onclick="App.renderExamSetup()">New Mock Exam</button>
        <button class="btn btn-outline" onclick="App.navigate('dashboard')">Dashboard</button>
      </div>`;

    examState = null;
  }

  // ── UTILS ──
  function esc(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

  /**
   * Query an element by ID within the CURRENT MODULE's view.
   * Prevents duplicate-ID bugs: multiple views share IDs like 'question-area',
   * 'difficulty-bar', etc. getElementById returns the first in DOM order,
   * which may be a hidden view. This scopes to the active module.
   */
  function getEl(id) {
    if (currentModule) {
      const view = document.getElementById('view-' + currentModule);
      if (view) return view.querySelector('#' + id);
    }
    return document.getElementById(id);
  }

  // ── THEME ──
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('gmat_theme'); } catch {}
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    updateThemeIcon();
    // Sync meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = document.documentElement.getAttribute('data-theme') === 'dark' ? '#0d1117' : '#1a2744';
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('gmat_theme', next); } catch {}
    updateThemeIcon();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'dark' ? '#0d1117' : '#1a2744';
  }
  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
  }

  // ── INIT ──
  function init() {
    initTheme();
    // Nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const view = link.dataset.view;
        if (['multiplication','arithmetic','percentages','wordProblems','brainTeasers','numberTheory','estimation','dataSufficiency','errorDetection','fastQuant','quantStrategy','constraintDeduction','speedRecognition','memoryChunking','visualSpatial','mimQuant','dataInsights','criticalReasoning'].includes(view)) {
          startModule(view);
        } else {
          navigate(view);
        }
      });
    });
    document.querySelector('.logo').addEventListener('click', () => navigate('dashboard'));
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModalAndNext();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape' || e.key === 'Enter') {
        const ov = document.getElementById('modal-overlay');
        if (ov.classList.contains('active')) closeModalAndNext();
      }
    });
    renderDashboard();
  }

  return {
    init, navigate, startModule, nextQuestion,
    submitInput, submitChoice, closeModalAndNext, endSession,
    toggleTable, setDifficulty, setWPDifficulty, setBTCategory, setGenericDifficulty,
    goToQuestion, prevQuestion, nextBrowserQuestion,
    switchUser, addNewUser, deleteCurrentUser, resetStats,
    renderReview, toggleTheme,
    renderExamSetup, startExam, setExamLength, setExamDiff,
    examSelectChoice, examToggleFlag, examPrev, examNext, examFinish,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
