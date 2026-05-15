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
  let lastEarnedXP = 0;

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
  let completedIds = {}; // { questionId: 'correct' | 'wrong' }

  const SPEED_MODULES = ['multiplication', 'arithmetic', 'percentages'];

  // Adaptive difficulty
  let adaptiveHistory = []; // last N {correct: bool, timeMs: number}
  const ADAPTIVE_WINDOW = 5;
  const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

  // ── FEEDBACK ──
  function haptic(style) {
    if (navigator.vibrate) navigator.vibrate(style === 'success' ? 30 : style === 'error' ? [40, 30, 40] : 15);
  }
  function showStreakBurst(streak) {
    if (streak % 5 !== 0 || streak === 0) return;
    const el = document.createElement('div');
    el.className = 'streak-confetti';
    el.textContent = streak >= 20 ? '🏆' : streak >= 10 ? '🔥' : '🎯';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ── ADAPTIVE DIFFICULTY ──
  function checkAdaptiveDifficulty() {
    if (!SPEED_MODULES.includes(currentModule) || currentModule === 'multiplication') return;
    if (adaptiveHistory.length < ADAPTIVE_WINDOW) return;

    const recent = adaptiveHistory.slice(-ADAPTIVE_WINDOW);
    const correctCount = recent.filter(r => r.correct).length;
    const avgTime = recent.reduce((s, r) => s + r.timeMs, 0) / recent.length;

    let currentDiff;
    switch (currentModule) {
      case 'arithmetic': currentDiff = arithDifficulty; break;
      case 'percentages': currentDiff = pctDifficulty; break;
      default: return;
    }

    const idx = DIFFICULTY_ORDER.indexOf(currentDiff);
    let newIdx = idx;

    if (correctCount >= 3 && avgTime < 8000 && idx < 2) {
      newIdx = idx + 1;
    } else if (correctCount <= 2 && idx > 0) {
      newIdx = idx - 1;
    }

    if (newIdx !== idx) {
      const newDiff = DIFFICULTY_ORDER[newIdx];
      switch (currentModule) {
        case 'arithmetic': arithDifficulty = newDiff; renderDifficultyBar(); break;
        case 'percentages': pctDifficulty = newDiff; renderDifficultyBar(); break;
      }
      showAdaptiveToast(newIdx > idx);
      adaptiveHistory = [];
    }
  }

  function showAdaptiveToast(harder) {
    const el = document.createElement('div');
    el.className = 'adaptive-toast';
    el.textContent = harder ? '⬆ Harder!' : '⬇ Easier';
    el.style.background = harder ? 'var(--success)' : 'var(--warning)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  // ── COMPLETED QUESTIONS PERSISTENCE ──
  function _completedKey() {
    return `gmat_completed_${Stats.getActiveUser()}`;
  }
  function loadCompleted() {
    try {
      const raw = localStorage.getItem(_completedKey());
      if (!raw) { completedIds = {}; return; }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Backward compat: old format was array of IDs
        completedIds = {};
        parsed.forEach(id => { completedIds[id] = 'correct'; });
        saveCompleted(); // migrate
      } else {
        completedIds = parsed || {};
      }
    } catch { completedIds = {}; }
  }
  function saveCompleted() {
    try { localStorage.setItem(_completedKey(), JSON.stringify(completedIds)); } catch {}
  }

  // ── CLEANUP ──
  function cleanupModule() {
    if (stopwatchInterval) { clearInterval(stopwatchInterval); stopwatchInterval = null; }
    if (examState && examState.timerInterval) { clearInterval(examState.timerInterval); examState.timerInterval = null; }
    if (fastGame && fastGame.timerInterval) { clearInterval(fastGame.timerInterval); fastGame.timerInterval = null; }
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
    if (view === 'allGames') renderAllGames();
    if (view === 'fastGame') renderFastGameSetup();
    if (view === 'leaderboard') renderLeaderboard();
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
    adaptiveHistory = [];
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
        const first = questionPool.findIndex(q => !completedIds[q.id]);
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
    const lp = Stats.getLevelProgress();
    const improvement = Stats.getWeeklyImprovement();
    const strengths = Stats.getTopicStrengths();

    let html = `
      <div class="hub-player-row">
        <select id="user-select" onchange="App.switchUser(this.value)" class="hub-user-select">
          ${allUsers.map(u => `<option value="${esc(u)}" ${u===activeUser?'selected':''}>${esc(u)}</option>`).join('')}
        </select>
        <div class="hub-player-actions">
          <button class="btn btn-outline btn-sm" onclick="App.addNewUser()">+</button>
          ${allUsers.length > 1 ? `<button class="btn btn-outline btn-sm" onclick="App.deleteCurrentUser()" style="color:var(--danger)">×</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="App.resetStats()" style="color:var(--danger)">↺</button>
        </div>
      </div>

      <div class="hub-hero">
        <div class="hub-level-row">
          <div class="level-badge">Lv ${lp.level}</div>
          <div class="hub-level-bar-wrap">
            <div class="level-bar"><div class="level-fill" style="width:${lp.percent}%"></div></div>
            <div class="level-xp">${lp.xpInLevel} / ${lp.xpNeeded} XP</div>
          </div>
        </div>
        <div class="hub-streaks-row">
          <div class="hub-streak">🔥 <strong>${stats.dailyStreak || 0}</strong> day streak</div>
          <div class="hub-streak">⚡ <strong>${stats.currentStreak}</strong> in a row</div>
          <div class="hub-streak">🎯 <strong>${Stats.getAccuracy()}%</strong> accuracy</div>
        </div>
        ${improvement !== null ? `<div class="hero-improvement ${improvement >= 0 ? 'positive' : 'negative'}">${improvement >= 0 ? '↑' : '↓'} ${Math.abs(improvement)}% vs last week</div>` : ''}
        ${strengths.strongest ? `<div class="hub-insight">${strengths.weakest && strengths.weakest !== strengths.strongest ? `📚 Focus on: <strong>${strengths.weakest}</strong>` : `💪 Top: <strong>${strengths.strongest}</strong>`}</div>` : ''}
      </div>

      <div class="hub-actions">
        <div class="hub-card hub-card-primary" onclick="App.startFastGame()">
          <div class="hub-card-icon">⚡</div>
          <div class="hub-card-text">
            <h3>Fast Game</h3>
            <p>2-min mixed challenge</p>
          </div>
          <div class="hub-card-arrow">→</div>
        </div>

        <div class="hub-card hub-card-secondary" onclick="App.navigate('examSim')">
          <div class="hub-card-icon">🏆</div>
          <div class="hub-card-text">
            <h3>Mock Exam</h3>
            <p>Timed GMAT simulation</p>
          </div>
          <div class="hub-card-arrow">→</div>
        </div>

        <div class="hub-bottom-row hub-bottom-3">
          <div class="hub-card hub-card-small" onclick="App.navigate('allGames')">
            <div class="hub-card-icon">🎮</div>
            <h3>All Games</h3>
            <p>${stats.totalAnswered} played</p>
          </div>
          <div class="hub-card hub-card-small" onclick="App.navigate('leaderboard')">
            <div class="hub-card-icon">🏅</div>
            <h3>Ranking</h3>
            <p>Compete globally</p>
          </div>
          <div class="hub-card hub-card-small" onclick="App.navigate('review')">
            <div class="hub-card-icon">📖</div>
            <h3>Review</h3>
            <p>Mistakes log</p>
          </div>
        </div>
      </div>
    `;
    el.innerHTML = html;
  }

  // ── ALL GAMES ──
  function renderAllGames() {
    const stats = Stats.getAll();
    const el = document.getElementById('view-allGames');
    const topicGroups = Stats.getTopicGroups();

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
      <div class="allgames-header">
        <button class="btn btn-outline btn-sm" onclick="App.navigate('dashboard')">← Back</button>
        <h2>All Games</h2>
      </div>
    `;

    // Topic progress summary
    html += '<div class="topic-progress-section"><h3 style="margin-bottom:12px">Topic Progress</h3>';
    for (const [name, g] of Object.entries(topicGroups)) {
      html += `
        <div class="topic-bar-row">
          <div class="topic-bar-label">${name}</div>
          <div class="topic-bar-track"><div class="topic-bar-fill" style="width:${Math.min(g.accuracy, 100)}%"></div></div>
          <div class="topic-bar-pct">${g.accuracy}%</div>
        </div>`;
    }
    html += '</div>';

    // Module grid
    html += '<div class="module-grid">';
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
          <div class="module-progress-bar"><div class="module-progress-fill" style="width:${acc}%"></div></div>
        </div>`;
    }
    html += '</div>';

    // Study resources
    html += `
      <h2 style="margin:24px 0 16px">Study Resources</h2>
      <div class="hub-bottom-row">
        <div class="hub-card hub-card-small" onclick="App.navigate('tricks')">
          <div class="hub-card-icon">💡</div>
          <h3>Math Tricks</h3>
          <p>Mental shortcuts</p>
        </div>
        <div class="hub-card hub-card-small" onclick="App.navigate('learn')">
          <div class="hub-card-icon">📚</div>
          <h3>Study Guide</h3>
          <p>Strategies & theory</p>
        </div>
      </div>
    `;

    el.innerHTML = html;
  }

  // ── FAST GAME ──
  let fastGame = null;

  function startFastGame() {
    navigate('fastGame');
  }

  function renderFastGameSetup() {
    const el = document.getElementById('view-fastGame');
    el.innerHTML = `
      <div class="fastgame-setup">
        <button class="btn btn-outline btn-sm" onclick="App.navigate('dashboard')" style="align-self:flex-start">← Back</button>
        <div class="fastgame-hero-icon">⚡</div>
        <h2>Fast Game</h2>
        <p class="fastgame-desc">Random questions from all topics. How many can you nail?</p>
        <div class="fastgame-time-options">
          <button class="btn btn-outline fastgame-time-btn active" onclick="App.setFastGameTime(120)" data-time="120">2 min</button>
          <button class="btn btn-outline fastgame-time-btn" onclick="App.setFastGameTime(180)" data-time="180">3 min</button>
          <button class="btn btn-outline fastgame-time-btn" onclick="App.setFastGameTime(300)" data-time="300">5 min</button>
        </div>
        <button class="btn btn-primary fastgame-start-btn" onclick="App.launchFastGame()">Start Game</button>
      </div>
    `;
    fastGame = { timeLimit: 120 };
  }

  function setFastGameTime(seconds) {
    fastGame.timeLimit = seconds;
    document.querySelectorAll('.fastgame-time-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.time) === seconds);
    });
  }

  function launchFastGame() {
    const el = document.getElementById('view-fastGame');
    
    // Build random question pool from all available modules
    const pool = [];
    
    // Add procedural questions
    const difficulties = ['easy', 'medium', 'hard'];
    for (let i = 0; i < 10; i++) {
      const d = difficulties[Math.floor(Math.random() * 3)];
      pool.push(Questions.getMultiplication([2,3,4,5,6,7,8,9,10,11,12]));
      pool.push(Questions.getArithmetic(d));
      pool.push(Questions.getPercentage(d));
    }
    
    // Add browser module questions (random subset)
    const browserGetters = [
      'getAllWordProblems', 'getAllBrainTeasers', 'getAllNumberTheory',
      'getAllEstimation', 'getAllDataSufficiency', 'getAllErrorDetection',
      'getAllFastQuant', 'getAllQuantStrategy', 'getAllConstraintDeduction',
      'getAllMimQuant', 'getAllDataInsights', 'getAllCriticalReasoning', 'getAllRiddles'
    ];
    for (const getter of browserGetters) {
      if (Questions[getter]) {
        const all = Questions[getter]();
        if (all.length > 0) {
          // Pick 3 random questions from each module
          const shuffled = [...all].sort(() => Math.random() - 0.5);
          for (let i = 0; i < Math.min(3, shuffled.length); i++) {
            pool.push(shuffled[i]);
          }
        }
      }
    }
    
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    fastGame = {
      ...fastGame,
      pool,
      index: 0,
      correct: 0,
      total: 0,
      startTime: Date.now(),
      timerInterval: null,
      active: true,
    };

    renderFastGameQuestion();
    startFastGameTimer();
  }

  function startFastGameTimer() {
    const updateTimer = () => {
      if (!fastGame || !fastGame.active) return;
      const elapsed = Math.floor((Date.now() - fastGame.startTime) / 1000);
      const remaining = Math.max(0, fastGame.timeLimit - elapsed);
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      const timerEl = document.getElementById('fg-timer');
      if (timerEl) {
        timerEl.textContent = `${min}:${String(sec).padStart(2, '0')}`;
        if (remaining <= 10) timerEl.classList.add('fg-timer-warning');
      }
      if (remaining <= 0) {
        endFastGame();
      }
    };
    fastGame.timerInterval = setInterval(updateTimer, 500);
    updateTimer();
  }

  function renderFastGameQuestion() {
    if (!fastGame || !fastGame.active) return;
    const el = document.getElementById('view-fastGame');
    const q = fastGame.pool[fastGame.index % fastGame.pool.length];
    fastGame._currentQ = q;
    fastGame._qStart = performance.now();

    // Determine module for stats recording
    if (q.meta && q.meta.module) fastGame._currentModule = q.meta.module;
    else if (q.id) {
      // Infer module from ID prefix
      if (q.id.startsWith('wp_')) fastGame._currentModule = 'wordProblems';
      else if (q.id.startsWith('bt_')) fastGame._currentModule = 'brainTeasers';
      else if (q.id.startsWith('nt_') || q.id.startsWith('cnt_')) fastGame._currentModule = 'numberTheory';
      else if (q.id.startsWith('est_')) fastGame._currentModule = 'estimation';
      else if (q.id.startsWith('ds_')) fastGame._currentModule = 'dataSufficiency';
      else if (q.id.startsWith('ed_')) fastGame._currentModule = 'errorDetection';
      else if (q.id.startsWith('fq_')) fastGame._currentModule = 'fastQuant';
      else if (q.id.startsWith('qs_')) fastGame._currentModule = 'quantStrategy';
      else if (q.id.startsWith('cd_')) fastGame._currentModule = 'constraintDeduction';
      else if (q.id.startsWith('mq_')) fastGame._currentModule = 'mimQuant';
      else if (q.id.startsWith('di_')) fastGame._currentModule = 'dataInsights';
      else if (q.id.startsWith('cr_')) fastGame._currentModule = 'criticalReasoning';
      else if (q.id.startsWith('rd_')) fastGame._currentModule = 'riddles';
      else fastGame._currentModule = 'brainTeasers';
    } else {
      fastGame._currentModule = q.meta?.module || 'arithmetic';
    }

    let questionHtml;
    if (q.choices) {
      // Multiple choice
      const choicesHtml = q.choices.map((c, i) => 
        `<button class="choice-btn" onclick="App.fastGameAnswer(${i})">${esc(c)}</button>`
      ).join('');
      questionHtml = `
        <div class="fg-question-text">${esc(q.text)}</div>
        ${q.statement1 ? `<div class="ds-statements"><p><strong>Statement 1:</strong> ${esc(q.statement1)}</p><p><strong>Statement 2:</strong> ${esc(q.statement2)}</p></div>` : ''}
        <div class="choices">${choicesHtml}</div>
      `;
    } else {
      // Input type
      questionHtml = `
        <div class="fg-question-text">${esc(q.text)}</div>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="text" id="fg-input" class="answer-input" inputmode="decimal" autocomplete="off" placeholder="Your answer" onkeydown="if(event.key==='Enter')App.fastGameSubmitInput()">
          <button class="btn btn-primary" onclick="App.fastGameSubmitInput()">Submit</button>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="fastgame-play">
        <div class="fg-header">
          <div class="fg-score">${fastGame.correct}/${fastGame.total}</div>
          <div class="fg-timer" id="fg-timer">--:--</div>
          <button class="btn btn-outline btn-sm" onclick="App.endFastGame()">End</button>
        </div>
        <div class="fg-progress-bar">
          <div class="fg-progress-fill" style="width:${Math.min(100, ((Date.now() - fastGame.startTime) / (fastGame.timeLimit * 1000)) * 100)}%"></div>
        </div>
        <div class="fg-question-card">
          ${questionHtml}
        </div>
      </div>
    `;

    // Focus input if present
    const inp = document.getElementById('fg-input');
    if (inp) setTimeout(() => inp.focus(), 50);
  }

  function fastGameAnswer(choiceIdx) {
    if (!fastGame || !fastGame.active) return;
    const q = fastGame._currentQ;
    const ok = choiceIdx === q.correct;
    const timeMs = Math.round(performance.now() - fastGame._qStart);
    
    fastGame.total++;
    if (ok) fastGame.correct++;
    
    // Record in stats
    const userAns = q.choices[choiceIdx];
    const correctAns = q.choices[q.correct];
    Stats.record(fastGame._currentModule, q.text, userAns, correctAns, ok, timeMs);
    
    haptic(ok ? 'success' : 'error');
    
    // Brief visual feedback then next
    const btns = document.querySelectorAll('.choice-btn');
    btns.forEach((b, i) => {
      if (i === q.correct) b.classList.add('correct');
      if (i === choiceIdx && !ok) b.classList.add('wrong');
      b.disabled = true;
    });
    
    setTimeout(() => {
      fastGame.index++;
      renderFastGameQuestion();
    }, ok ? 300 : 1200);
  }

  function fastGameSubmitInput() {
    if (!fastGame || !fastGame.active) return;
    const inp = document.getElementById('fg-input');
    if (!inp || !inp.value.trim()) return;
    
    const q = fastGame._currentQ;
    const userAns = inp.value.trim();
    const correctAns = String(q.correctAnswer);
    const ok = checkAnswer(userAns, correctAns);
    const timeMs = Math.round(performance.now() - fastGame._qStart);
    
    fastGame.total++;
    if (ok) fastGame.correct++;
    
    Stats.record(fastGame._currentModule, q.text, userAns, correctAns, ok, timeMs);
    haptic(ok ? 'success' : 'error');
    
    inp.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      const feedback = document.createElement('div');
      feedback.className = 'fg-correct-feedback';
      feedback.textContent = `Correct: ${correctAns}`;
      inp.parentElement.appendChild(feedback);
    }
    
    setTimeout(() => {
      fastGame.index++;
      renderFastGameQuestion();
    }, ok ? 300 : 1500);
  }

  function endFastGame() {
    if (!fastGame) return;
    fastGame.active = false;
    if (fastGame.timerInterval) clearInterval(fastGame.timerInterval);
    
    const elapsed = Math.floor((Date.now() - fastGame.startTime) / 1000);
    const acc = fastGame.total > 0 ? Math.round((fastGame.correct / fastGame.total) * 100) : 0;
    
    const el = document.getElementById('view-fastGame');
    el.innerHTML = `
      <div class="fastgame-results">
        <div class="fg-results-icon">${acc >= 80 ? '🏆' : acc >= 60 ? '🎯' : '💪'}</div>
        <h2>Game Over!</h2>
        <div class="fg-results-grid">
          <div class="fg-result-item">
            <div class="fg-result-value">${fastGame.correct}/${fastGame.total}</div>
            <div class="fg-result-label">Correct</div>
          </div>
          <div class="fg-result-item">
            <div class="fg-result-value">${acc}%</div>
            <div class="fg-result-label">Accuracy</div>
          </div>
          <div class="fg-result-item">
            <div class="fg-result-value">${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}</div>
            <div class="fg-result-label">Time</div>
          </div>
        </div>
        <div class="fg-results-actions">
          <button class="btn btn-primary" onclick="App.startFastGame()">Play Again</button>
          <button class="btn btn-outline" onclick="App.navigate('dashboard')">Home</button>
        </div>
      </div>
    `;
  }

  // ── LEADERBOARD ──
  function renderLeaderboard() {
    const el = document.getElementById('view-leaderboard');
    el.innerHTML = `
      <div class="lb-container">
        <div class="lb-header">
          <button class="btn btn-outline btn-sm" onclick="App.navigate('dashboard')">← Back</button>
          <h2>🏅 Leaderboard</h2>
        </div>
        <div class="lb-submit-section">
          <p class="lb-submit-desc">Share your progress with the community!</p>
          <div class="lb-submit-row">
            <input type="text" id="lb-nickname" class="answer-input" placeholder="Your nickname" maxlength="20" style="flex:1">
            <button class="btn btn-primary" onclick="App.submitToLeaderboard()">Submit</button>
          </div>
          <div id="lb-submit-status"></div>
        </div>
        <div id="lb-list" class="lb-list">
          <div class="lb-loading">Loading...</div>
        </div>
      </div>
    `;

    const lastNick = localStorage.getItem('gmat_lb_nickname');
    if (lastNick) document.getElementById('lb-nickname').value = lastNick;

    Stats.getLeaderboard(entries => {
      renderLeaderboardList(entries);
    });
  }

  function renderLeaderboardList(entries) {
    const el = document.getElementById('lb-list');
    if (!el) return;

    if (entries.length === 0) {
      el.innerHTML = '<div class="lb-empty">No scores yet. Be the first!</div>';
      return;
    }

    let html = `
      <div class="lb-table-header">
        <span class="lb-rank">#</span>
        <span class="lb-name">Player</span>
        <span class="lb-xp">XP</span>
        <span class="lb-level">Level</span>
        <span class="lb-acc">Acc.</span>
      </div>
    `;

    entries.forEach((entry, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      html += `
        <div class="lb-row ${i < 3 ? 'lb-row-top' : ''}">
          <span class="lb-rank">${medal}</span>
          <span class="lb-name">${esc(entry.nickname)}${entry.streak > 0 ? ` <span class="lb-streak-badge">🔥${entry.streak}</span>` : ''}</span>
          <span class="lb-xp">${entry.xp.toLocaleString()}</span>
          <span class="lb-level">Lv${entry.level}</span>
          <span class="lb-acc">${entry.accuracy}%</span>
        </div>
      `;
    });

    el.innerHTML = html;
  }

  function submitToLeaderboard() {
    const inp = document.getElementById('lb-nickname');
    const statusEl = document.getElementById('lb-submit-status');
    if (!inp || !inp.value.trim()) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">Enter a nickname first</span>';
      return;
    }

    // Disable button to prevent spam
    const submitBtn = inp.parentElement.querySelector('.btn-primary');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

    const nickname = inp.value.trim();
    try { localStorage.setItem('gmat_lb_nickname', nickname); } catch {}

    if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-light)">Submitting...</span>';

    Stats.submitScore(nickname, (success) => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }
      if (statusEl) {
        statusEl.innerHTML = success
          ? '<span style="color:var(--success)">✓ Score submitted!</span>'
          : '<span style="color:var(--warning)">Saved locally (offline)</span>';
      }
      Stats.getLeaderboard(entries => {
        renderLeaderboardList(entries);
      });
    });
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
    const done = questionPool.filter(q => completedIds[q.id]).length;
    const correctCount = questionPool.filter(q => completedIds[q.id] === 'correct').length;

    let html = `<div class="sidebar-header">${correctCount}✓ ${done - correctCount}✗ / ${total}</div><ul class="sidebar-list">`;
    questionPool.forEach((q, i) => {
      const status = completedIds[q.id]; // 'correct', 'wrong', or undefined
      const isDone = !!status;
      const isCurrent = i === questionIndex;
      const preview = q.text.length > 45 ? q.text.slice(0, 42) + '…' : q.text;
      html += `<li class="sidebar-item${isCurrent ? ' current' : ''}${status === 'correct' ? ' done-correct' : status === 'wrong' ? ' done-wrong' : ''}" onclick="App.goToQuestion(${i})" title="${esc(q.text)}">
        <span class="sidebar-num">${i+1}</span>
        <span class="sidebar-status ${status === 'correct' ? 'status-correct' : status === 'wrong' ? 'status-wrong' : ''}">${status === 'correct' ? '✓' : status === 'wrong' ? '✗' : '○'}</span>
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
    const result = Stats.record(currentModule, currentQuestion.text, userAns, correctAns, ok, timeMs);
    lastEarnedXP = result.totalXP;
    haptic(ok ? 'success' : 'error');
    if (ok) showStreakBurst(result.data.currentStreak);
    // Mark question as completed in browser
    if (currentQuestion.id) { completedIds[currentQuestion.id] = ok ? 'correct' : 'wrong'; saveCompleted(); }
    updateSessionUI(result.data);
    // Adaptive difficulty tracking
    adaptiveHistory.push({ correct: ok, timeMs });
    checkAdaptiveDifficulty();
    // Update sidebar if in browser mode
    if (isBrowserModule(currentModule) && getEl('question-sidebar')) {
      renderSidebar();
    }
  }

  function updateSessionUI(statsData) {
    const s = getEl('session-score');
    const st = getEl('session-streak');
    if (s) s.textContent = `${sessionCorrect}/${sessionTotal}`;
    if (st) st.textContent = (statsData || Stats.getAll()).currentStreak;
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
      <p style="margin-bottom:8px">Time: <strong>${formatStopwatch(timeMs)}</strong></p>
      <div class="xp-earned ${ok ? 'correct' : ''}">+${lastEarnedXP} XP</div>
      ${expl ? (expl.length > 200
        ? `<div class="explanation-block"><h4>Step-by-Step Solution</h4><p style="white-space:pre-line" class="expl-short">${esc(expl.slice(0, 180))}…</p><p style="white-space:pre-line;display:none" class="expl-full">${esc(expl)}</p><button class="btn btn-outline btn-sm expl-toggle" onclick="var b=this.closest('.explanation-block');b.querySelector('.expl-short').style.display='none';b.querySelector('.expl-full').style.display='block';this.style.display='none'">See full reasoning →</button></div>`
        : `<div class="explanation-block"><h4>Step-by-Step Solution</h4><p style="white-space:pre-line">${esc(expl)}</p></div>`)
      : ''}
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

    // Exam history
    const history = Stats.getExamHistory();
    if (history.length > 0) {
      let histHtml = '<h3 style="margin-top:32px;margin-bottom:12px">📋 Past Exams</h3>';
      histHtml += '<div class="exam-history-list">';
      history.slice().reverse().forEach((exam, idx) => {
        const realIdx = history.length - 1 - idx;
        const date = new Date(exam.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        histHtml += `
          <div class="exam-history-item" onclick="App.reviewPastExam(${realIdx})">
            <div class="exam-hist-left">
              <div class="exam-hist-score">${exam.score}</div>
              <div class="exam-hist-date">${dateStr} ${timeStr}</div>
            </div>
            <div class="exam-hist-right">
              <div class="exam-hist-detail">${exam.correct}/${exam.total} · ${exam.accuracy}%</div>
              <div class="exam-hist-arrow">→</div>
            </div>
          </div>
        `;
      });
      histHtml += '</div>';
      el.innerHTML += histHtml;
    }
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
    const estScore = 205 + Math.round((rawScore / 100) * 60) * 10;

    const el = document.getElementById('view-examSim');
    const reviewHtml = details.map((d, i) => {
      const statusClass = !d.isAnswered ? 'skipped' : d.isCorrect ? 'correct' : 'wrong';
      const statusIcon = !d.isAnswered ? '○' : d.isCorrect ? '✓' : '✗';
      const userAnswer = d.isAnswered ? d.q.choices[d.userIdx] : '—';
      const correctAnswer = d.q.choices[d.q.correct];
      const explText = d.q.explanation || '';
      return `<div class="exam-review-item ${statusClass}">
        <div class="exam-review-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="exam-review-num">${i+1}. ${statusIcon}</span>
          <span class="exam-review-text">${esc(d.q.text.length > 80 ? d.q.text.slice(0,77)+'…' : d.q.text)}</span>
          <span class="exam-review-time">${Stats.formatTime(Math.round(d.time))}</span>
          <span class="exam-review-toggle">▼</span>
        </div>
        <div class="exam-review-detail">
          <p class="exam-review-q" style="white-space:pre-line">${esc(d.q.text)}</p>
          <div class="exam-review-answers">
            ${d.q.choices.map((c, ci) => {
              let cls = '';
              if (ci === d.q.correct) cls = 'review-correct';
              else if (ci === d.userIdx && !d.isCorrect) cls = 'review-wrong';
              const marker = ci === d.userIdx ? '► ' : '  ';
              return `<div class="exam-review-choice ${cls}">${marker}${esc(c)}</div>`;
            }).join('')}
          </div>
          ${!d.isAnswered ? '<p class="review-note">Not answered</p>' : ''}
          ${explText ? `<div class="exam-review-expl"><strong>Explanation:</strong> <span style="white-space:pre-line">${esc(explText)}</span></div>` : ''}
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <h2 style="margin-bottom:6px">📊 Exam Results</h2>
      <p style="color:var(--text-light);margin-bottom:20px">Exam completed in ${Math.floor(totalTime/60000)} min ${Math.floor((totalTime%60000)/1000)} sec</p>
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-value" style="color:var(--primary)">${estScore}</div><div class="stat-label">Est. Score (approx.) <span class="score-info-btn" onclick="event.stopPropagation();document.getElementById('gmat-score-info').classList.toggle('hidden')">ⓘ</span></div></div>
        <div class="stat-card"><div class="stat-value">${correct}/${total}</div><div class="stat-label">Correct</div></div>
        <div class="stat-card"><div class="stat-value">${accuracy}%</div><div class="stat-label">Accuracy</div></div>
        <div class="stat-card"><div class="stat-value">${Stats.formatTime(avgTime)}</div><div class="stat-label">Avg Time</div></div>
      </div>
      <div id="gmat-score-info" class="score-info-panel hidden">
        <h4>How GMAT Scoring Works</h4>
        <p>The GMAT Focus Edition scores range from <strong>205 to 805</strong>, in 10-point increments.</p>
        <ul>
          <li><strong>Median score:</strong> ~552 (50th percentile)</li>
          <li><strong>700+:</strong> Top ~12% — competitive for top MBA programs</li>
          <li><strong>650-700:</strong> Strong score for most programs</li>
          <li><strong>600-650:</strong> Average — sufficient for many programs</li>
          <li><strong>Below 600:</strong> Below average — may limit options</li>
        </ul>
        <p style="margin-top:8px;font-size:0.82rem;color:var(--text-light)">⚠ This score is a rough approximation based on accuracy only. The real GMAT uses adaptive difficulty, varied question types (Quant, Verbal, DI), and a proprietary algorithm. Use this as a directional guide, not a prediction.</p>
      </div>
      <h3 style="margin-bottom:12px">Question Review</h3>
      <div class="exam-review-list">${reviewHtml}</div>
      <div class="btn-group" style="margin-top:24px">
        <button class="btn btn-primary" onclick="App.renderExamSetup()">New Mock Exam</button>
        <button class="btn btn-outline" onclick="App.navigate('dashboard')">Dashboard</button>
      </div>`;

    // Save exam to history
    Stats.saveExamResult({
      date: new Date().toISOString(),
      score: estScore,
      correct,
      total,
      accuracy,
      avgTime,
      timeMs: totalTime,
      config: examState.config,
      questions: details.map(d => ({
        text: d.q.text,
        choices: d.q.choices,
        correct: d.q.correct,
        userIdx: d.userIdx,
        isCorrect: d.isCorrect,
        isAnswered: d.isAnswered,
        time: Math.round(d.time),
        explanation: d.q.explanation || '',
      })),
    });

    examState = null;
  }

  function reviewPastExam(idx) {
    const history = Stats.getExamHistory();
    const exam = history[idx];
    if (!exam) return;

    const el = document.getElementById('view-examSim');
    const totalTime = exam.timeMs;

    const reviewHtml = exam.questions.map((d, i) => {
      const statusClass = !d.isAnswered ? 'skipped' : d.isCorrect ? 'correct' : 'wrong';
      const statusIcon = !d.isAnswered ? '○' : d.isCorrect ? '✓' : '✗';
      const explText = d.explanation || '';
      return `<div class="exam-review-item ${statusClass}">
        <div class="exam-review-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="exam-review-num">${i+1}. ${statusIcon}</span>
          <span class="exam-review-text">${esc(d.text.length > 80 ? d.text.slice(0,77)+'…' : d.text)}</span>
          <span class="exam-review-time">${Stats.formatTime(d.time)}</span>
          <span class="exam-review-toggle">▼</span>
        </div>
        <div class="exam-review-detail">
          <p class="exam-review-q" style="white-space:pre-line">${esc(d.text)}</p>
          <div class="exam-review-answers">
            ${d.choices.map((c, ci) => {
              let cls = '';
              if (ci === d.correct) cls = 'review-correct';
              else if (ci === d.userIdx && !d.isCorrect) cls = 'review-wrong';
              const marker = ci === d.userIdx ? '► ' : '  ';
              return `<div class="exam-review-choice ${cls}">${marker}${esc(c)}</div>`;
            }).join('')}
          </div>
          ${!d.isAnswered ? '<p class="review-note">Not answered</p>' : ''}
          ${explText ? `<div class="exam-review-expl"><strong>Explanation:</strong> <span style="white-space:pre-line">${esc(explText)}</span></div>` : ''}
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="exam-results-header">
        <button class="btn btn-outline btn-sm" onclick="App.renderExamSetup()">← Back</button>
        <h2>📊 Exam Review</h2>
      </div>
      <p style="color:var(--text-light);margin-bottom:20px">${new Date(exam.date).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}</p>
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-value" style="color:var(--primary)">${exam.score}</div><div class="stat-label">Est. Score</div></div>
        <div class="stat-card"><div class="stat-value">${exam.correct}/${exam.total}</div><div class="stat-label">Correct</div></div>
        <div class="stat-card"><div class="stat-value">${exam.accuracy}%</div><div class="stat-label">Accuracy</div></div>
        <div class="stat-card"><div class="stat-value">${Stats.formatTime(exam.avgTime)}</div><div class="stat-label">Avg Time</div></div>
      </div>
      <h3 style="margin-bottom:12px">Question Review</h3>
      <div class="exam-review-list">${reviewHtml}</div>
      <div class="btn-group" style="margin-top:24px">
        <button class="btn btn-outline" onclick="App.renderExamSetup()">Back to Exams</button>
      </div>`;
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
        if (['multiplication','arithmetic','percentages','wordProblems','brainTeasers','numberTheory','estimation','dataSufficiency','errorDetection','fastQuant','quantStrategy','constraintDeduction','speedRecognition','memoryChunking','visualSpatial','mimQuant','dataInsights','criticalReasoning','riddles'].includes(view)) {
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
    reviewPastExam,
    startFastGame, launchFastGame, setFastGameTime, fastGameAnswer, fastGameSubmitInput, endFastGame, renderAllGames,
    submitToLeaderboard, renderLeaderboard,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
