/* ===== GMAT Math Trainer — Stats Engine (localStorage + User Profiles) ===== */

const Stats = (() => {
  const USERS_KEY = 'gmat_trainer_users';
  const ACTIVE_KEY = 'gmat_trainer_active_user';

  const DEFAULT = {
    totalAnswered: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
    modules: {
      multiplication: { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      arithmetic:     { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      percentages:    { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      wordProblems:   { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      brainTeasers:   { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      numberTheory:   { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      estimation:     { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      dataSufficiency:{ answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      errorDetection: { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      fastQuant:      { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      quantStrategy:  { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      constraintDeduction: { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      speedRecognition:    { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      memoryChunking:      { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      visualSpatial:       { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      mimQuant:            { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      dataInsights:        { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      criticalReasoning:   { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      riddles:             { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
      examSim:             { answered: 0, correct: 0, totalTime: 0, bestTime: null, times: [], mistakes: [] },
    },
    sessions: [],
    lastPlayed: null,
    xp: 0,
    level: 1,
    dailyStreak: 0,
    lastDailyDate: null,
    weeklyHistory: [],
  };

  // ── USER MANAGEMENT ──
  function _getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch { return []; }
  }

  function _saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getActiveUser() {
    const active = localStorage.getItem(ACTIVE_KEY);
    if (!active) {
      // Auto-create default user on first run
      const users = _getUsers();
      if (users.length === 0) {
        users.push('Player 1');
        _saveUsers(users);
      }
      localStorage.setItem(ACTIVE_KEY, users[0]);
      return users[0];
    }
    return active;
  }

  function setActiveUser(name) {
    localStorage.setItem(ACTIVE_KEY, name);
  }

  function getAllUsers() {
    getActiveUser(); // ensure at least one exists
    return _getUsers();
  }

  function addUser(name) {
    const users = _getUsers();
    if (users.includes(name)) return false;
    users.push(name);
    _saveUsers(users);
    return true;
  }

  function deleteUser(name) {
    let users = _getUsers();
    users = users.filter(u => u !== name);
    _saveUsers(users);
    localStorage.removeItem(_storageKey(name));
    if (getActiveUser() === name) {
      if (users.length === 0) { users.push('Player 1'); _saveUsers(users); }
      setActiveUser(users[0]);
    }
  }

  function _storageKey(user) {
    return 'gmat_stats_' + (user || getActiveUser());
  }

  function _load() {
    try {
      const raw = localStorage.getItem(_storageKey());
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      const parsed = JSON.parse(raw);
      for (const key of Object.keys(DEFAULT.modules)) {
        if (!parsed.modules[key]) {
          parsed.modules[key] = JSON.parse(JSON.stringify(DEFAULT.modules[key]));
        }
      }
      // Ensure new gamification fields exist
      if (parsed.xp === undefined) parsed.xp = 0;
      if (parsed.level === undefined) parsed.level = 1;
      if (parsed.dailyStreak === undefined) parsed.dailyStreak = 0;
      if (parsed.lastDailyDate === undefined) parsed.lastDailyDate = null;
      if (parsed.weeklyHistory === undefined) parsed.weeklyHistory = [];
      return parsed;
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT));
    }
  }

  function _save(data) {
    localStorage.setItem(_storageKey(), JSON.stringify(data));
  }

  /** Record a single answer */
  function record(module, question, userAnswer, correctAnswer, isCorrect, timeMs) {
    const data = _load();
    const mod = data.modules[module];

    data.totalAnswered++;
    mod.answered++;
    mod.totalTime += timeMs;
    mod.times.push(timeMs);

    // keep only last 200 times to avoid bloating storage
    if (mod.times.length > 200) mod.times = mod.times.slice(-200);

    if (isCorrect) {
      data.totalCorrect++;
      mod.correct++;
      data.currentStreak++;
      if (data.currentStreak > data.bestStreak) data.bestStreak = data.currentStreak;
      // update best time for correct answers only
      if (mod.bestTime === null || timeMs < mod.bestTime) mod.bestTime = timeMs;
    } else {
      data.currentStreak = 0;
      // store mistake (keep last 100 per module)
      mod.mistakes.push({
        question: typeof question === 'string' ? question : JSON.stringify(question),
        userAnswer: String(userAnswer),
        correctAnswer: String(correctAnswer),
        date: new Date().toISOString(),
        timeMs,
      });
      if (mod.mistakes.length > 100) mod.mistakes = mod.mistakes.slice(-100);
    }

    data.lastPlayed = new Date().toISOString();

    // ── XP SYSTEM ──
    const baseXP = isCorrect ? 10 : 2;
    const streakBonus = data.currentStreak >= 10 ? 5 : data.currentStreak >= 5 ? 3 : 0;
    const speedBonus = timeMs < 5000 ? 3 : timeMs < 10000 ? 1 : 0;
    const totalXP = baseXP + streakBonus + speedBonus;
    data.xp += totalXP;
    // Level: 100 XP per level, increasing by 50 each level
    data.level = 1;
    let xpNeeded = 100;
    let xpAccum = 0;
    while (xpAccum + xpNeeded <= data.xp) {
      xpAccum += xpNeeded;
      data.level++;
      xpNeeded = 100 + (data.level - 1) * 50;
    }

    // ── DAILY STREAK ──
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    if (data.lastDailyDate !== today) {
      const yd = new Date(Date.now() - 86400000);
      const yesterday = yd.getFullYear() + '-' + String(yd.getMonth()+1).padStart(2,'0') + '-' + String(yd.getDate()).padStart(2,'0');
      if (data.lastDailyDate === yesterday) {
        data.dailyStreak++;
      } else if (data.lastDailyDate !== today) {
        data.dailyStreak = 1;
      }
      data.lastDailyDate = today;
    }

    // ── WEEKLY HISTORY ──
    const lastEntry = data.weeklyHistory[data.weeklyHistory.length - 1];
    if (lastEntry && lastEntry.date === today) {
      lastEntry.answered++;
      if (isCorrect) lastEntry.correct++;
    } else {
      data.weeklyHistory.push({ date: today, answered: 1, correct: isCorrect ? 1 : 0 });
    }
    if (data.weeklyHistory.length > 14) data.weeklyHistory = data.weeklyHistory.slice(-14);

    _save(data);
    return { data, totalXP };
  }

  /** Save a session summary */
  function saveSession(module, correct, total, avgTime) {
    const data = _load();
    data.sessions.push({
      date: new Date().toISOString(),
      module,
      correct,
      total,
      avgTime: Math.round(avgTime),
    });
    // keep last 200 sessions
    if (data.sessions.length > 200) data.sessions = data.sessions.slice(-200);
    _save(data);
  }

  /** Get all stats */
  function getAll() { return _load(); }

  /** Get module stats */
  function getModule(module) { return _load().modules[module]; }

  /** Get all mistakes for a module (most recent first) */
  function getMistakes(module) {
    const mod = _load().modules[module];
    return (mod.mistakes || []).slice().reverse();
  }

  /** Get all mistakes across modules */
  function getAllMistakes() {
    const data = _load();
    const all = [];
    for (const [mod, info] of Object.entries(data.modules)) {
      for (const m of (info.mistakes || [])) {
        all.push({ ...m, module: mod });
      }
    }
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /** Get average time for a module (last N answers) */
  function getAvgTime(module, lastN = 20) {
    const mod = _load().modules[module];
    const times = mod.times || [];
    const slice = times.slice(-lastN);
    if (slice.length === 0) return 0;
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  /** Get overall accuracy % */
  function getAccuracy() {
    const data = _load();
    if (data.totalAnswered === 0) return 0;
    return Math.round((data.totalCorrect / data.totalAnswered) * 100);
  }

  /** Format milliseconds to human-readable */
  function formatTime(ms) {
    if (ms < 1000) return ms + 'ms';
    const seconds = (ms / 1000).toFixed(1);
    if (ms < 60000) return seconds + 's';
    const min = Math.floor(ms / 60000);
    const sec = Math.round((ms % 60000) / 1000);
    return min + ':' + String(sec).padStart(2, '0');
  }

  /** Get XP needed for current level and progress */
  function getLevelProgress() {
    const data = _load();
    let lvl = 1, xpAccum = 0, xpNeeded = 100;
    while (xpAccum + xpNeeded <= data.xp) {
      xpAccum += xpNeeded;
      lvl++;
      xpNeeded = 100 + (lvl - 1) * 50;
    }
    const xpInLevel = data.xp - xpAccum;
    return { level: lvl, xp: data.xp, xpInLevel, xpNeeded, percent: Math.round((xpInLevel / xpNeeded) * 100) };
  }

  /** Get topic group stats */
  function getTopicGroups() {
    const data = _load();
    const groups = {
      'Arithmetic': ['multiplication', 'arithmetic', 'percentages'],
      'Algebra & Logic': ['numberTheory', 'constraintDeduction', 'brainTeasers', 'riddles'],
      'Word Problems': ['wordProblems', 'estimation', 'fastQuant'],
      'GMAT Quant': ['dataSufficiency', 'errorDetection', 'quantStrategy', 'mimQuant'],
      'Data & Reasoning': ['dataInsights', 'criticalReasoning'],
      'Cognitive Skills': ['speedRecognition', 'memoryChunking', 'visualSpatial'],
    };
    const result = {};
    for (const [name, mods] of Object.entries(groups)) {
      let answered = 0, correct = 0, totalTime = 0;
      for (const m of mods) {
        const mod = data.modules[m];
        if (mod) { answered += mod.answered; correct += mod.correct; totalTime += mod.totalTime; }
      }
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
      const avgTime = answered > 0 ? Math.round(totalTime / answered) : 0;
      result[name] = { answered, correct, accuracy, avgTime };
    }
    return result;
  }

  /** Get weekly improvement */
  function getWeeklyImprovement() {
    const data = _load();
    const hist = data.weeklyHistory || [];
    if (hist.length < 2) return null;
    const thisWeek = hist.slice(-7);
    const prevWeek = hist.slice(-14, -7);
    if (prevWeek.length === 0) return null;
    const thisAcc = thisWeek.reduce((s, d) => s + d.correct, 0) / Math.max(1, thisWeek.reduce((s, d) => s + d.answered, 0));
    const prevAcc = prevWeek.reduce((s, d) => s + d.correct, 0) / Math.max(1, prevWeek.reduce((s, d) => s + d.answered, 0));
    const diff = Math.round((thisAcc - prevAcc) * 100);
    return diff;
  }

  /** Get strongest and weakest topics */
  function getTopicStrengths() {
    const data = _load();
    let best = null, worst = null, bestAcc = -1, worstAcc = 101;
    const labels = {
      multiplication:'Multiplication', arithmetic:'Arithmetic', percentages:'Percentages',
      wordProblems:'Word Problems', brainTeasers:'Brain Teasers', numberTheory:'Number Theory',
      estimation:'Estimation', dataSufficiency:'Data Sufficiency', errorDetection:'Error Detection',
      fastQuant:'Fast Quant', quantStrategy:'Quant Strategy', constraintDeduction:'Constraint Deduction',
      mimQuant:'MiM Quant', dataInsights:'Data Insights', criticalReasoning:'Critical Reasoning',
      riddles:'Riddles',
    };
    for (const [key, label] of Object.entries(labels)) {
      const mod = data.modules[key];
      if (!mod || mod.answered < 5) continue;
      const acc = (mod.correct / mod.answered) * 100;
      if (acc > bestAcc) { bestAcc = acc; best = label; }
      if (acc < worstAcc) { worstAcc = acc; worst = label; }
    }
    return { strongest: best, weakest: worst, strongestAcc: Math.round(bestAcc), weakestAcc: Math.round(worstAcc) };
  }

  /** Reset stats for active user */
  function reset() {
    localStorage.removeItem(_storageKey());
  }

  // ── EXAM HISTORY ──
  const EXAM_HISTORY_KEY = 'gmat_exam_history';

  function saveExamResult(result) {
    try {
      const user = getActiveUser();
      const key = EXAM_HISTORY_KEY + '_' + user;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      // Strip explanations to save space — keep only metadata + answers
      if (result.questions) {
        result.questions = result.questions.map(q => ({
          text: q.text.slice(0, 200),
          choices: q.choices,
          correct: q.correct,
          userIdx: q.userIdx,
          isCorrect: q.isCorrect,
          isAnswered: q.isAnswered,
          time: q.time,
        }));
      }
      history.push(result);
      // Keep last 10 exams
      if (history.length > 10) history.splice(0, history.length - 10);
      localStorage.setItem(key, JSON.stringify(history));
    } catch {}
  }

  function getExamHistory() {
    try {
      const user = getActiveUser();
      const key = EXAM_HISTORY_KEY + '_' + user;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  }

  // ── LEADERBOARD ──
  const FIREBASE_DB_URL = ''; // Set to your Firebase Realtime Database URL, e.g. 'https://your-project.firebaseio.com'
  const LB_LOCAL_KEY = 'gmat_leaderboard';

  function getLeaderboard(callback) {
    if (FIREBASE_DB_URL) {
      fetch(`${FIREBASE_DB_URL}/leaderboard.json?orderBy="xp"&limitToLast=50`)
        .then(r => r.json())
        .then(data => {
          if (!data) return callback([]);
          const entries = Object.values(data).sort((a, b) => b.xp - a.xp);
          try { localStorage.setItem(LB_LOCAL_KEY, JSON.stringify(entries)); } catch {}
          callback(entries);
        })
        .catch(() => {
          try { callback(JSON.parse(localStorage.getItem(LB_LOCAL_KEY)) || []); } catch { callback([]); }
        });
    } else {
      try { callback(JSON.parse(localStorage.getItem(LB_LOCAL_KEY)) || []); } catch { callback([]); }
    }
  }

  function submitScore(nickname, callback) {
    const data = _load();
    const lp = getLevelProgress();
    const entry = {
      nickname: nickname.slice(0, 20),
      xp: data.xp,
      level: lp.level,
      accuracy: data.totalAnswered > 0 ? Math.round((data.totalCorrect / data.totalAnswered) * 100) : 0,
      answered: data.totalAnswered,
      streak: data.dailyStreak || 0,
      date: new Date().toISOString().slice(0, 10),
    };

    if (FIREBASE_DB_URL) {
      fetch(`${FIREBASE_DB_URL}/leaderboard/${encodeURIComponent(nickname.replace(/[.#$[\]\/]/g, '_'))}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
        .then(r => r.json())
        .then(() => {
          _saveLocalLB(entry);
          if (callback) callback(true);
        })
        .catch(() => {
          _saveLocalLB(entry);
          if (callback) callback(false);
        });
    } else {
      _saveLocalLB(entry);
      if (callback) callback(true);
    }
  }

  function _saveLocalLB(entry) {
    try {
      const lb = JSON.parse(localStorage.getItem(LB_LOCAL_KEY)) || [];
      const filtered = lb.filter(e => e.nickname !== entry.nickname);
      filtered.push(entry);
      filtered.sort((a, b) => b.xp - a.xp);
      localStorage.setItem(LB_LOCAL_KEY, JSON.stringify(filtered.slice(0, 50)));
    } catch {}
  }

  return {
    record, saveSession, getAll, getModule, getMistakes, getAllMistakes,
    getAvgTime, getAccuracy, formatTime, reset,
    getLevelProgress, getTopicGroups, getWeeklyImprovement, getTopicStrengths,
    getActiveUser, setActiveUser, getAllUsers, addUser, deleteUser,
    getLeaderboard, submitScore,
    saveExamResult, getExamHistory,
  };
})();
