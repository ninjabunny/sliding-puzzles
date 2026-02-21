// Pointer Events drag handler for the puzzle canvas
// State machine: IDLE → PRESSING → DRAGGING → IDLE

class InputHandler {
  constructor(canvas, gameState, renderer, onMove, onWin) {
    this.canvas = canvas;
    this.gameState = gameState;
    this.renderer = renderer;
    this.onMove = onMove;
    this.onWin = onWin;

    this.state = 'IDLE';
    this.pointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.dragState = null;

    canvas.addEventListener('pointerdown', this._onDown.bind(this));
    canvas.addEventListener('pointermove', this._onMove.bind(this));
    canvas.addEventListener('pointerup', this._onUp.bind(this));
    canvas.addEventListener('pointercancel', this._onUp.bind(this));
  }

  _cell() {
    return this.renderer.cellSize;
  }

  _canvasPos(ev) {
    const rect = this.canvas.getBoundingClientRect();
    return [ev.clientX - rect.left, ev.clientY - rect.top];
  }

  _onDown(ev) {
    if (this.state !== 'IDLE') return;
    ev.preventDefault();

    const C = this._cell();
    const [px, py] = this._canvasPos(ev);
    const col = Math.floor(px / C);
    const row = Math.floor(py / C);
    const pieceId = this.gameState.pieceAt(col, row);
    if (!pieceId) return;
    if (this.gameState.pieces.get(pieceId).isStatic) return;

    this.canvas.setPointerCapture(ev.pointerId);
    this.pointerId = ev.pointerId;
    this.startX = px;
    this.startY = py;
    this.state = 'PRESSING';
    this.pressedPieceId = pieceId;
    this.dragState = null;

    this.canvas.classList.add('dragging');
  }

  _onMove(ev) {
    if (this.state === 'IDLE' || ev.pointerId !== this.pointerId) return;
    ev.preventDefault();

    const C = this._cell();
    const AXIS_THRESHOLD = C / 4;
    const [px, py] = this._canvasPos(ev);
    const dx = px - this.startX;
    const dy = py - this.startY;

    if (this.state === 'PRESSING') {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;

      const dir = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

      const maxForward = this.gameState.maxMove(this.pressedPieceId, dir);
      const revDir = { left: 'right', right: 'left', up: 'down', down: 'up' }[dir];
      const maxBack = this.gameState.maxMove(this.pressedPieceId, revDir);
      const group = this.gameState.collectGroup(this.pressedPieceId, dir)
                    || new Set([this.pressedPieceId]);

      this.dragState = { pieceId: this.pressedPieceId, group, dir, pixelOffset: 0, maxForward, maxBack };
      this.state = 'DRAGGING';
    }

    if (this.state === 'DRAGGING') {
      const isHoriz = this.dragState.dir === 'left' || this.dragState.dir === 'right';
      const raw = isHoriz ? dx : dy;
      const maxF = this.dragState.maxForward * C;
      const maxB = this.dragState.maxBack * C;

      let clamped;
      if (this.dragState.dir === 'right' || this.dragState.dir === 'down') {
        clamped = Math.max(-maxB, Math.min(maxF, raw));
      } else {
        clamped = Math.max(-maxF, Math.min(maxB, raw));
      }

      this.dragState.pixelOffset = clamped;
      this.renderer.render(this.gameState, this.dragState);
    }
  }

  _onUp(ev) {
    if (this.state === 'IDLE' || ev.pointerId !== this.pointerId) return;
    ev.preventDefault();

    this.canvas.classList.remove('dragging');

    if (this.state === 'DRAGGING' && this.dragState) {
      const C = this._cell();
      const offset = this.dragState.pixelOffset;
      let steps;
      if (this.dragState.dir === 'right' || this.dragState.dir === 'down') {
        steps = Math.round(offset / C);
      } else {
        steps = Math.round(-offset / C);
      }
      steps = Math.max(0, Math.min(steps, this.dragState.maxForward));

      if (steps > 0) {
        this.gameState.movePiece(this.dragState.pieceId, this.dragState.dir, steps);
        if (this.onMove) this.onMove();
        if (this.gameState.checkWin() && this.onWin) this.onWin();
      }
    }

    this.state = 'IDLE';
    this.pointerId = null;
    this.dragState = null;
    this.pressedPieceId = null;

    this.renderer.render(this.gameState, null);
  }

  setGameState(gameState) {
    this.gameState = gameState;
    this.state = 'IDLE';
    this.dragState = null;
  }
}
