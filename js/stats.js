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
    },
    sessions: [],
    lastPlayed: null,
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
    _save(data);
    return data;
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

  /** Reset stats for active user */
  function reset() {
    localStorage.removeItem(_storageKey());
  }

  return {
    record, saveSession, getAll, getModule, getMistakes, getAllMistakes,
    getAvgTime, getAccuracy, formatTime, reset,
    getActiveUser, setActiveUser, getAllUsers, addUser, deleteUser,
  };
})();
