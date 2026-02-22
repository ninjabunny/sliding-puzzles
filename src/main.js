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

const gameState = new GameState();
const renderer = new Renderer(canvas);
let inputHandler = null;
let currentLevelIndex = -1;
let allLevels = [...BUILTIN_LEVELS];

function updateHUD() {
  hudMoves.textContent = gameState.moveCount;
}

function showGame() {
  levelSelect.hidden = true;
  gameContainer.hidden = false;
  winOverlay.hidden = true;
}

function showLevelSelect() {
  levelSelect.hidden = false;
  gameContainer.hidden = true;
  winOverlay.hidden = true;
}

function showWin() {
  winMoves.textContent = gameState.moveCount;
  winOverlay.hidden = false;
}

function loadAndPlay(levelJson, levelIndex) {
  currentLevelIndex = levelIndex;
  hudTitle.textContent = levelJson.name || `Level ${levelIndex + 1}`;
  hudPar.textContent = `/ ${levelJson.minMoves ?? '?'}`;
  gameState.loadLevel(levelJson);
  renderer.resize(levelJson.width, levelJson.height);
  renderer.render(gameState, null);
  updateHUD();
  showGame();

  if (!inputHandler) {
    inputHandler = new InputHandler(canvas, gameState, renderer, () => {
      updateHUD();
    }, () => {
      showWin();
    });
  } else {
    inputHandler.setGameState(gameState);
  }
}

function buildLevelCards() {
  levelSelect.innerHTML = '';

  for (let i = 0; i < allLevels.length; i++) {
    const level = allLevels[i];
    const card = document.createElement('div');
    card.className = 'level-card';

    const thumb = document.createElement('canvas');
    thumb.className = 'level-thumb';
    renderer.renderThumbnail(thumb, level);

    const name = document.createElement('div');
    name.className = 'level-name';
    name.textContent = level.name || `Level ${i + 1}`;

    const par = document.createElement('div');
    par.className = 'level-par';
    par.textContent = `Par: ${level.minMoves ?? '?'}`;

    const btn = document.createElement('button');
    btn.className = 'btn-play';
    btn.textContent = 'Play';
    btn.addEventListener('click', () => loadAndPlay(level, i));

    card.appendChild(thumb);
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
  gameState.reset();
  renderer.render(gameState, null);
  updateHUD();
  winOverlay.hidden = true;
});

btnBack.addEventListener('click', () => {
  showLevelSelect();
});

btnWinNext.addEventListener('click', () => {
  const next = currentLevelIndex + 1;
  if (next < allLevels.length) {
    loadAndPlay(allLevels[next], next);
  } else {
    showLevelSelect();
  }
});

btnWinReset.addEventListener('click', () => {
  gameState.reset();
  renderer.render(gameState, null);
  updateHUD();
  winOverlay.hidden = true;
});

// Import JSON
importBtn.addEventListener('click', () => importInput.click());
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
