/* ===== GMAT Math Trainer — App Core Engine ===== */

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

  // Question browser state (for WP and BT modules)
  let questionPool = [];     // filtered question list
  let questionIndex = -1;    // current index in pool
  let completedIds = new Set(); // IDs of answered questions (per user)

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
    if (view === 'review') renderReview();
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
    if (module === 'wordProblems' || module === 'brainTeasers') {
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
  };

  function renderModuleUI() {
    const el = document.getElementById('view-' + currentModule);
    if (!el) return;
    const modStats = Stats.getModule(currentModule);
    const showBest = modStats.bestTime ? `<span class="best-time">Best: ${Stats.formatTime(modStats.bestTime)}</span>` : '';
    const isBrowser = currentModule === 'wordProblems' || currentModule === 'brainTeasers';

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
      ${currentModule === 'arithmetic' || currentModule === 'percentages' ? '<div class="difficulty-bar" id="difficulty-bar"></div>' : ''}
      ${currentModule === 'wordProblems' ? '<div class="difficulty-bar" id="difficulty-bar"></div>' : ''}
      ${currentModule === 'brainTeasers' ? '<div class="difficulty-bar" id="difficulty-bar"></div>' : ''}
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
    if (currentModule === 'arithmetic' || currentModule === 'percentages') renderDifficultyBar();
    if (currentModule === 'wordProblems') renderWPDifficultyBar();
    if (currentModule === 'brainTeasers') renderBTCategoryBar();
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
    const diff = currentModule==='arithmetic' ? arithDifficulty : pctDifficulty;
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
      {key:'logic',label:'Logic'},{key:'counting',label:'Counting'},{key:'lateral',label:'Lateral'},
    ];
    el.innerHTML = cats.map(c =>
      `<button class="diff-btn ${c.key===btCategory?'active':''}" onclick="App.setBTCategory('${c.key}')">${c.label}</button>`
    ).join('');
  }

  // ── QUESTION BROWSER (sidebar) ──
  function rebuildPool() {
    if (currentModule === 'wordProblems') {
      let all = Questions.getAllWordProblems();
      if (wpDifficulty !== 'all') all = all.filter(q => q.difficulty === wpDifficulty);
      questionPool = all;
    } else if (currentModule === 'brainTeasers') {
      let all = Questions.getAllBrainTeasers();
      if (btCategory !== 'all') all = all.filter(q => q.category === btCategory);
      questionPool = all;
    }
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
    }
    if (!q) return;
    currentQuestion = q;
    renderQuestion(q);
    startStopwatch();
  }

  function renderQuestion(q) {
    const area = getEl('question-area');
    if (!area) return;
    if (q.choices) {
      const isLong = q.text.length > 100;
      area.innerHTML = `
        <div class="question-card">
          <div class="question-text ${isLong ? 'small' : ''}">${esc(q.text)}</div>
          <div class="choices" id="choices">
            ${q.choices.map((c,i) => `<button class="choice-btn" data-idx="${i}" onclick="App.submitChoice(${i})">${esc(c)}</button>`).join('')}
          </div>
        </div>`;
    } else {
      area.innerHTML = `
        <div class="question-card">
          <div class="question-text">${esc(q.text)}</div>
          <div class="answer-input-wrap">
            <input type="text" inputmode="decimal" class="answer-input" id="answer-input"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
              onkeydown="if(event.key==='Enter')App.submitInput()">
            <button class="btn btn-primary" onclick="App.submitInput()">Submit</button>
          </div>
        </div>`;
      // Only autofocus on non-touch devices to avoid unwanted keyboard popup on mobile
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
    if ((currentModule === 'wordProblems' || currentModule === 'brainTeasers') && getEl('question-sidebar')) {
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
    const isBrowser = (currentModule === 'wordProblems' || currentModule === 'brainTeasers') && questionPool.length > 0;
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
    const isBrowser = (currentModule === 'wordProblems' || currentModule === 'brainTeasers') && questionPool.length > 0;
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

  // ── REVIEW MISTAKES ──
  function renderReview() {
    const el = document.getElementById('view-review');
    const mistakes = Stats.getAllMistakes();
    let html = '<h2 style="margin-bottom:16px">Review Mistakes</h2>';
    if (!mistakes.length) {
      html += '<p style="color:var(--text-light)">No mistakes yet! Start practicing.</p>';
      el.innerHTML = html; return;
    }
    const labels = { multiplication:'Multiplication', arithmetic:'Arithmetic', percentages:'Percentages', wordProblems:'Word Problems', brainTeasers:'Brain Teasers' };
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

  // ── INIT ──
  function init() {
    // Nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const view = link.dataset.view;
        if (['multiplication','arithmetic','percentages','wordProblems','brainTeasers'].includes(view)) {
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
      if (e.key === 'Escape') {
        const ov = document.getElementById('modal-overlay');
        if (ov.classList.contains('active')) closeModalAndNext();
      }
    });
    renderDashboard();
  }

  return {
    init, navigate, startModule, nextQuestion,
    submitInput, submitChoice, closeModalAndNext, endSession,
    toggleTable, setDifficulty, setWPDifficulty, setBTCategory,
    goToQuestion, prevQuestion, nextBrowserQuestion,
    switchUser, addNewUser, deleteCurrentUser, resetStats,
    renderReview,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
