// Game page orchestration

const levelSelect = document.getElementById('level-select-wrap');
const gameContainer = document.getElementById('game-container');
const winOverlay = document.getElementById('win-overlay');
const canvas = document.getElementById('game-canvas');
const hudTitle = document.getElementById('hud-title');
const hudMoves = document.getElementById('hud-moves');
const hudPar = document.getElementById('hud-par');
const winMoves = document.getElementById('win-moves');
const btnReset = document.getElementById('btn-reset');
const btnBack = document.getElementById('btn-back');
const btnWinNext = document.getElementById('btn-win-next');
const btnWinReset = document.getElementById('btn-win-reset');
const importInput = document.getElementById('import-input');
const importBtn = document.getElementById('import-btn');
const achievementsFooter = document.getElementById('achievements-footer');
const achievementsDialog = document.getElementById('achievements-dialog');
const btnResetAchievements = document.getElementById('btn-reset-achievements');
const btnAchievementsConfirm = document.getElementById('btn-achievements-confirm');
const btnAchievementsCancel = document.getElementById('btn-achievements-cancel');
const btnSettings = document.getElementById('btn-settings');
const settingsDialog = document.getElementById('settings-dialog');
const settingHaptics = document.getElementById('setting-haptics');
const btnSettingsClose = document.getElementById('btn-settings-close');

const confettiCanvas = document.getElementById('confetti-canvas');

const gameState = new GameState();
const renderer = new Renderer(canvas);
let inputHandler = null;
let currentLevelIndex = -1;
let currentLevelMinMoves = null;
let allLevels = [...BUILTIN_LEVELS];
const badgeElements = new Map(); // levelIndex → badge span
const SETTINGS_KEY = 'slidingPuzzlesSettings';
const HAPTIC_PATTERNS = Object.freeze({
  tap: 8,
  move: 12,
  win: [24, 36, 24],
  winConfetti: [18, 32, 24, 28, 36, 26, 54],
  reset: [10, 18, 10],
});

let appSettings = loadSettings();

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures (private mode, quota, etc.)
  }
}

function loadSettings() {
  const stored = loadJSON(SETTINGS_KEY, {});
  return {
    hapticsEnabled: stored.hapticsEnabled !== false,
  };
}

function saveSettings() {
  saveJSON(SETTINGS_KEY, appSettings);
}

function syncSettingsUI() {
  settingHaptics.checked = appSettings.hapticsEnabled;
}

function triggerHaptic(patternName) {
  if (!appSettings.hapticsEnabled) return;
  if (typeof navigator?.vibrate !== 'function') return;
  const pattern = HAPTIC_PATTERNS[patternName];
  if (pattern == null) return;
  navigator.vibrate(pattern);
}

function loadProgress() {
  return loadJSON('slidingPuzzlesProgress', {});
}

function saveProgress(levelName, atPar) {
  if (!levelName) return;
  const progress = loadProgress();
  const prev = progress[levelName] || {};
  progress[levelName] = { solved: true, solvedAtPar: prev.solvedAtPar || atPar };
  saveJSON('slidingPuzzlesProgress', progress);
}

function badgeText(prog) {
  if (!prog) return '';
  return prog.solvedAtPar ? '🏆' : '⭐';
}

function updateBadge(levelIndex) {
  const badge = badgeElements.get(levelIndex);
  if (!badge) return;
  const level = allLevels[levelIndex];
  badge.textContent = badgeText(loadProgress()[level?.name]);
}

function launchConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const colors = ['#ff6b6b','#ffd43b','#a9e34b','#45b7d1','#a29bfe','#ffa94d','#fd79a8'];
  const particles = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -10 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 5,
    vy: 2 + Math.random() * 4,
    w: 7 + Math.random() * 7,
    h: 4 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const duration = 3200;
  let start = null;
  function frame(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    const fade = elapsed > duration * 0.65
      ? Math.max(0, 1 - (elapsed - duration * 0.65) / (duration * 0.35))
      : 1;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vrot;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
  requestAnimationFrame(frame);
}

function updateHUD() {
  hudMoves.textContent = gameState.moveCount;
}

function showGame() {
  levelSelect.hidden = true;
  achievementsFooter.hidden = true;
  gameContainer.hidden = false;
  winOverlay.hidden = true;
}

function showLevelSelect() {
  levelSelect.hidden = false;
  achievementsFooter.hidden = false;
  gameContainer.hidden = true;
  winOverlay.hidden = true;
}

function showWin(atPar) {
  winMoves.textContent = gameState.moveCount;
  winOverlay.hidden = false;
  triggerHaptic(atPar ? 'winConfetti' : 'win');
  if (atPar) launchConfetti();
  const level = allLevels[currentLevelIndex];
  if (level?.name) {
    saveProgress(level.name, atPar);
    updateBadge(currentLevelIndex);
  }
  gtag('event', 'level_solved', {
    level_name: level?.name ?? `Level ${currentLevelIndex + 1}`,
    moves: gameState.moveCount,
    par: currentLevelMinMoves,
    at_par: atPar,
  });
}

function loadAndPlay(levelJson, levelIndex) {
  currentLevelIndex = levelIndex;
  currentLevelMinMoves = levelJson.minMoves ?? null;
  hudTitle.textContent = levelJson.name || `Level ${levelIndex + 1}`;
  hudPar.textContent = `/ ${currentLevelMinMoves ?? '?'}`;
  gameState.loadLevel(levelJson);
  renderer.resize(levelJson.width, levelJson.height);
  renderer.render(gameState, null);
  updateHUD();
  showGame();

  if (!inputHandler) {
    inputHandler = new InputHandler(canvas, gameState, renderer, () => {
      updateHUD();
      triggerHaptic('move');
    }, () => {
      showWin(currentLevelMinMoves != null && gameState.moveCount <= currentLevelMinMoves);
    });
  } else {
    inputHandler.setGameState(gameState);
  }
}

function buildLevelCards() {
  levelSelect.innerHTML = '';
  badgeElements.clear();
  const progress = loadProgress();

  for (let i = 0; i < allLevels.length; i++) {
    const level = allLevels[i];
    const card = document.createElement('div');
    card.className = 'level-card';
    card.addEventListener('click', () => {
      triggerHaptic('tap');
      loadAndPlay(level, i);
    });

    const badge = document.createElement('span');
    badge.className = 'level-badge';
    badge.textContent = badgeText(progress[level.name]);
    badgeElements.set(i, badge);

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'level-thumb-wrap';
    const thumb = document.createElement('canvas');
    thumb.className = 'level-thumb';
    renderer.renderThumbnail(thumb, level);
    thumbWrap.appendChild(thumb);

    const name = document.createElement('div');
    name.className = 'level-name';
    name.textContent = level.name || `Level ${i + 1}`;

    const par = document.createElement('div');
    par.className = 'level-par';
    par.textContent = `Par: ${level.minMoves ?? '?'}`;

    const btn = document.createElement('button');
    btn.className = 'btn-play';
    btn.textContent = 'Play';

    card.appendChild(badge);
    card.appendChild(thumbWrap);
    card.appendChild(name);
    card.appendChild(par);
    card.appendChild(btn);
    levelSelect.appendChild(card);
  }
}

// Check URL hash for editor test level
function checkHashLevel() {
  const hash = location.hash.slice(1);
  if (!hash) return false;
  try {
    const json = JSON.parse(atob(hash));
    allLevels = [...BUILTIN_LEVELS, json];
    buildLevelCards();
    loadAndPlay(json, allLevels.length - 1);
    return true;
  } catch {
    return false;
  }
}

// Buttons
btnReset.addEventListener('click', () => {
  triggerHaptic('reset');
  gameState.reset();
  renderer.render(gameState, null);
  updateHUD();
  winOverlay.hidden = true;
});

btnBack.addEventListener('click', () => {
  triggerHaptic('tap');
  showLevelSelect();
});

btnWinNext.addEventListener('click', () => {
  triggerHaptic('tap');
  const next = currentLevelIndex + 1;
  if (next < allLevels.length) {
    loadAndPlay(allLevels[next], next);
  } else {
    showLevelSelect();
  }
});

btnWinReset.addEventListener('click', () => {
  triggerHaptic('reset');
  gameState.reset();
  renderer.render(gameState, null);
  updateHUD();
  winOverlay.hidden = true;
});

// Reset achievements
btnResetAchievements.addEventListener('click', () => {
  triggerHaptic('tap');
  achievementsDialog.showModal();
});
btnAchievementsCancel.addEventListener('click', () => {
  triggerHaptic('tap');
  achievementsDialog.close();
});
btnAchievementsConfirm.addEventListener('click', () => {
  triggerHaptic('reset');
  try {
    localStorage.removeItem('slidingPuzzlesProgress');
  } catch {
    // Ignore storage write failures.
  }
  achievementsDialog.close();
  buildLevelCards();
});

// Import JSON
importBtn.addEventListener('click', () => {
  triggerHaptic('tap');
  importInput.click();
});
importInput.addEventListener('change', () => {
  const file = importInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      allLevels = [...BUILTIN_LEVELS, json];
      buildLevelCards();
      loadAndPlay(json, allLevels.length - 1);
    } catch {
      alert('Invalid level JSON file.');
    }
  };
  reader.readAsText(file);
  importInput.value = '';
});

// Settings
syncSettingsUI();
btnSettings.addEventListener('click', () => {
  triggerHaptic('tap');
  syncSettingsUI();
  settingsDialog.showModal();
});
settingHaptics.addEventListener('change', () => {
  appSettings.hapticsEnabled = settingHaptics.checked;
  saveSettings();
  if (appSettings.hapticsEnabled) triggerHaptic('tap');
});
btnSettingsClose.addEventListener('click', () => {
  triggerHaptic('tap');
  settingsDialog.close();
});

// Re-fit canvas when window is resized or screen rotates
window.addEventListener('resize', () => {
  if (!gameContainer.hidden && gameState.width) {
    renderer.resize(gameState.width, gameState.height);
    renderer.render(gameState, null);
  }
});

// Init
buildLevelCards();
if (!checkHashLevel()) {
  showLevelSelect();
}
