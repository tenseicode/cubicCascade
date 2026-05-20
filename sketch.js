const COLS        = 8;
const ROWS        = 8;
const CELL        = 56;
const GRID_X      = 36;         
const GRID_Y      = 100;
const TRAY_GAP    = 10;
const TRAY_HEIGHT = 130;
const HUD_Y       = 10;
const HUD_HEIGHT  = 80;
const CONTROL_BAR_Y = HUD_Y + HUD_HEIGHT + 6;
const CONTROL_BAR_H = 28;
const PIECE_SCALE = 0.62;

const COLORS = [
  '#FF4757', '#FFA502', '#FFD700',
  '#2ED573', '#1E90FF', '#A29BFE', '#FF6B81'
];

const SHAPES = [
  [[1]],
  [[1,1]],
  [[1],[1]],
  [[1,1,1]],
  [[1],[1],[1]],
  [[1,1],[1,1]],
  [[1,0],[1,0],[1,1]],
  [[0,1],[0,1],[1,1]],
  [[1,1,1],[0,1,0]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
  [[1,1,1],[1,1,1],[1,1,1]],
  [[0,1,0],[1,1,1],[0,1,0]],
  [[1,1],[1,0]],
  [[1,1,1,1]],
  [[1],[1],[1],[1]]
];

//Game state
let grid, tray, dragging;
let score, highScore, level, linesCleared;
let gameState = 'menu';
let particles, flashLines, flashTimer;
let bgStars;
let combo, comboTimer;
let shakeTimer, shakeAmt;
let soundEnabled = true;
let paused = false;
let showSettings = false;
let audioCtxStarted = false;
let gamesPlayed = 0, totalLines = 0, maxComboEver = 0;

const BTN_Y = CONTROL_BAR_Y + 4;
const BTN_H = 20, BTN_W = 56, BTN_GAP = 8;
const buttons = {
  pause:    { x: GRID_X, y: BTN_Y, w: BTN_W, h: BTN_H, label: '| |' },
  retry:    { x: GRID_X + (BTN_W+BTN_GAP)*1, y: BTN_Y, w: BTN_W, h: BTN_H, label: 'RETRY' },
  settings: { x: GRID_X + (BTN_W+BTN_GAP)*2, y: BTN_Y, w: BTN_W, h: BTN_H, label: 'GEAR' },
  sound:    { x: GRID_X + (BTN_W+BTN_GAP)*3, y: BTN_Y, w: BTN_W, h: BTN_H, label: 'SND:ON' },
  menu:     { x: GRID_X + (BTN_W+BTN_GAP)*4, y: BTN_Y, w: BTN_W, h: BTN_H, label: 'MENU' },
  // pause overlay buttons
  resume:   { x: 170, y: 400, w: 180, h: 46, label: 'RESUME' },
  pauseMenu:{ x: 170, y: 456, w: 180, h: 46, label: 'MENU' },
  // game over buttons
  goRetry:  { x: 120, y: 485, w: 130, h: 46, label: 'RETRY' },
  goMenu:   { x: 270, y: 485, w: 130, h: 46, label: 'MENU' },
};

//p5 Lifecycle
function setup() {
  const canvas = createCanvas(520, 720);
  canvas.parent('game-container');
  textFont('monospace');
  pixelDensity(1);

  getAudioContext().suspend();
  loadStats();
  highScore = getItem('cc_highScore') || 0;

  particles = [];
  bgStars = Array.from({ length: 60 }, () => ({
    x: random(width), y: random(height),
    s: random(1, 3), spd: random(0.2, 0.8),
    a: random(100, 200)
  }));

  initGame();
  gameState = 'menu';
}

function draw() {
  background(10, 10, 18);
  drawStars();
  switch (gameState) {
    case 'menu':     drawMenu(); break;
    case 'play':     drawPlay(); break;
    case 'gameover': drawGameOver(); break;
  }
}

//State & Persistence
function initGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  level = 1;
  linesCleared = 0;
  combo = 0;
  comboTimer = 0;
  flashLines = [];
  flashTimer = 0;
  shakeTimer = 0;
  shakeAmt = 0;
  dragging = null;
  paused = false;
  showSettings = false;
  particles = [];
  tray = [makePiece(), makePiece(), makePiece()];
}

function makePiece() {
  return { shape: random(SHAPES), color: random(COLORS) };
}

function refillTray() {
  if (tray.every(p => p === null)) {
    tray = [makePiece(), makePiece(), makePiece()];
  }
}

function loadStats() {
  gamesPlayed  = parseInt(getItem('cc_gamesPlayed')) || 0;
  totalLines   = parseInt(getItem('cc_totalLines')) || 0;
  maxComboEver = parseInt(getItem('cc_maxCombo')) || 0;
}

function saveStats() {
  storeItem('cc_gamesPlayed', gamesPlayed);
  storeItem('cc_totalLines', totalLines);
  storeItem('cc_maxCombo', maxComboEver);
  storeItem('cc_highScore', highScore);
}

function updatePersistentStats() {
  gamesPlayed++;
  totalLines += linesCleared;
  if (combo > maxComboEver) maxComboEver = combo;
  saveStats();
}

//Drawing helpers
function drawStars() {
  noStroke();
  for (let s of bgStars) {
    s.y += s.spd * 0.3;
    if (s.y > height) { s.y = 0; s.x = random(width); }
    fill(200, 220, 255, s.a);
    ellipse(s.x, s.y, s.s, s.s);
  }
}

function drawBlock(x, y, sz, col, glow = false) {
  const c = color(col);
  const pad = sz * 0.06;
  const inner = sz - pad * 2;
  if (glow) {
    noStroke();
    fill(red(c), green(c), blue(c), 40);
    rect(x - 4, y - 4, sz + 8, sz + 8, 6);
  }
  noStroke();
  fill(0, 0, 0, 80);
  rect(x + pad + 2, y + pad + 2, inner, inner, 4);
  fill(c);
  rect(x + pad, y + pad, inner, inner, 4);
  fill(255, 255, 255, 70);
  rect(x + pad, y + pad, inner, inner * 0.35, 4, 4, 0, 0);
  fill(255, 255, 255, 120);
  ellipse(x + pad + inner * 0.25, y + pad + inner * 0.22, inner * 0.18, inner * 0.18);
}

//Text‑only button rendering
function drawTextButton(b, active = true) {
  push();
  rectMode(CENTER);
  strokeWeight(1.5);
  stroke(active ? '#FFFFFF' : '#555');
  fill(active ? 20 : 10);
  rect(b.x + b.w/2, b.y + b.h/2, b.w, b.h, 6);
  noStroke();
  fill(active ? '#FFFFFF' : '#888');
  textAlign(CENTER, CENTER);
  textSize(10);
  let label = b.label;
  if (b === buttons.sound) {
    label = 'SND:' + (soundEnabled ? 'ON' : 'OFF');
  }
  text(label, b.x + b.w/2, b.y + b.h/2);
  pop();
}

function isInsideButton(b, mx, my) {
  return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
}

//Screens
function drawMenu() {
  //Title glow
  for (let i = 5; i > 0; i--) {
    fill(30, 144, 255, 20);
    noStroke();
    textSize(38 + i * 2);
    textAlign(CENTER, CENTER);
    text('CUBIC', width / 2, 190);
    text('CASCADE', width / 2, 240);
  }
  fill('#FFD700');
  textSize(38);
  text('CUBIC', width / 2, 190);
  fill('#FF4757');
  text('CASCADE', width / 2, 240);

  //Animated demo blocks
  const demoBlockSize = 34;
  const demoSpacing = 38;
  const cols = 5, rows = 3;
  const totalSpan = (cols - 1) * demoSpacing + demoBlockSize;
  const startX = width / 2 - totalSpan / 2;
  const t = frameCount * 0.04;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * demoSpacing + sin(t + c * 0.5) * 4;
      const y = 310 + r * demoSpacing + cos(t + r * 0.7) * 4;
      drawBlock(x, y, demoBlockSize, COLORS[(r * 5 + c) % COLORS.length], true);
    }
  }

  // Play button
  const pulse = sin(frameCount * 0.08) * 6;
  fill(30, 144, 255);
  noStroke();
  rectMode(CENTER);
  rect(width / 2, 510, 240 + pulse, 52, 10);
  fill(255);
  textSize(14);
  text('[ ENTER ]', width / 2, 510);
  rectMode(CORNER);

  fill(150, 180, 255);
  textSize(9);
  text('DRAG PIECES ONTO THE BOARD', width / 2, 580);
  text('FILL ROWS / COLUMNS TO CLEAR', width / 2, 600);

  fill('#FFD700');
  textSize(10);
  textAlign(CENTER);
  text('BEST: ' + nf(highScore, 6), width/2, 630);
  text('PLAYED: ' + gamesPlayed + '  LINES: ' + totalLines + '  MAX COMBO: ' + maxComboEver, width/2, 650);
}

function drawPlay() {
  let sx = 0, sy = 0;
  if (!paused && shakeTimer > 0) {
    sx = random(-shakeAmt, shakeAmt);
    sy = random(-shakeAmt, shakeAmt);
    shakeTimer--;
    shakeAmt *= 0.85;
  }
  push();
  translate(sx, sy);

  drawHUD();
  drawControlBar();
  drawGridBG();
  drawGridCells();
  drawFlashLines();
  drawTray();
  if (!paused && dragging) drawDraggingPiece();
  if (!paused && dragging) drawDragPreview();
  drawParticles();

  pop();

  //Combo banner
  if (!paused && comboTimer > 0) {
    comboTimer--;
    const alpha = map(comboTimer, 0, 80, 0, 255);
    const sc = constrain(map(comboTimer, 80, 60, 0.5, 1.2), 0.5, 1.2);
    push();
    translate(width / 2, 90);
    scale(sc);
    noStroke();
    fill(255, 200, 0, alpha);
    textSize(22);
    textAlign(CENTER, CENTER);
    text('COMBO x' + combo + '!', 0, 0);
    pop();
  }

  //Pause overlay
  if (paused) {
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, width, height);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text('PAUSED', width/2, height/2 - 60);
    drawTextButton(buttons.resume);
    drawTextButton(buttons.pauseMenu);
  }

  //Settings overlay
  if (showSettings) {
    drawSettingsOverlay();
  }

  //Cursor feedback
  if (!paused && !showSettings) {
    let over = false;
    for (let key of ['pause','retry','settings','sound','menu']) {
      if (isInsideButton(buttons[key], mouseX, mouseY)) over = true;
    }
    cursor(over ? HAND : ARROW);
  } else {
    cursor(ARROW);
  }
}

function drawControlBar() {
  fill(14, 18, 34, 200);
  noStroke();
  rect(GRID_X, CONTROL_BAR_Y, COLS * CELL, CONTROL_BAR_H, 4);

  drawTextButton(buttons.pause, !paused);
  drawTextButton(buttons.retry, true);
  drawTextButton(buttons.settings, true);
  drawTextButton(buttons.sound, soundEnabled);
  drawTextButton(buttons.menu, true);
}

function drawSettingsOverlay() {
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  fill(20, 24, 40);
  stroke(100, 140, 255);
  strokeWeight(2);
  rect(width/2-150, height/2-120, 300, 240, 12);
  noStroke();
  fill(255);
  textSize(16);
  textAlign(CENTER, CENTER);
  text('SETTINGS', width/2, height/2-90);

  fill(soundEnabled ? '#2ED573' : '#FF4757');
  rect(width/2-60, height/2-37, 120, 34, 8);
  fill(255);
  textSize(12);
  text(soundEnabled ? 'TURN OFF' : 'TURN ON', width/2, height/2-20);

  fill('#FFA502');
  rect(width/2-60, height/2+3, 120, 34, 8);
  fill(255);
  textSize(11);
  text('RESET BEST', width/2, height/2+20);

  fill('#1E90FF');
  rect(width/2-60, height/2+43, 120, 34, 8);
  fill(255);
  textSize(11);
  text('BACK', width/2, height/2+60);
}

function drawGameOver() {
  fill(0, 0, 0, 160);
  noStroke();
  rect(0, 0, width, height);

  fill(14, 18, 40);
  stroke(255, 71, 87);
  strokeWeight(3);
  rect(60, 180, width - 120, 340, 12);

  noStroke();
  fill('#FF4757');
  textSize(26);
  textAlign(CENTER, CENTER);
  text('GAME OVER', width / 2, 224);

  fill(180, 200, 255);
  textSize(9);
  text('SCORE', width / 2, 260);
  fill(255);
  textSize(24);
  text(nf(score, 7), width / 2, 286);

  fill(180, 200, 255);
  textSize(9);
  text('BEST', width / 2, 320);
  fill('#FFD700');
  textSize(20);
  text(nf(highScore, 7), width / 2, 344);

  if (score >= highScore && score > 0) {
    fill('#2ED573');
    textSize(10);
    text('NEW HIGH SCORE!', width / 2, 370);
  }

  fill(150, 180, 255);
  textSize(9);
  text('LINES: ' + linesCleared + '   COMBO: ' + combo + '   PLAYED: ' + gamesPlayed, width/2, 400);

  drawTextButton(buttons.goRetry);
  drawTextButton(buttons.goMenu);

  drawParticles();
}

//HUD & Grid components
function drawHUD() {
  fill(20, 24, 40);
  noStroke();
  rect(GRID_X, HUD_Y, 180, HUD_HEIGHT, 8);
  fill(100, 140, 255);
  textSize(8);
  textAlign(LEFT, TOP);
  text('SCORE', GRID_X + 12, HUD_Y + 10);
  fill(255);
  textSize(18);
  text(nf(score, 7), GRID_X + 12, HUD_Y + 24);

  fill(100, 140, 255);
  textSize(8);
  text('BEST', GRID_X + 12, HUD_Y + 52);
  fill('#FFD700');
  textSize(12);
  text(nf(highScore, 7), GRID_X + 12, HUD_Y + 64);

  fill(20, 24, 40);
  rect(width - GRID_X - 100, HUD_Y, 100, HUD_HEIGHT, 8);
  fill(100, 140, 255);
  textSize(8);
  textAlign(CENTER, TOP);
  text('LEVEL', width - GRID_X - 50, HUD_Y + 10);
  fill('#FFD700');
  textSize(30);
  text(level, width - GRID_X - 50, HUD_Y + 24);
  fill(100, 140, 255);
  textSize(8);
  text('LINES: ' + linesCleared, width - GRID_X - 50, HUD_Y + 64);
}

function drawGridBG() {
  fill(0, 0, 0, 80);
  noStroke();
  rect(GRID_X + 4, GRID_Y + 4, COLS * CELL, ROWS * CELL, 6);
  fill(14, 18, 34);
  stroke(30, 36, 60);
  strokeWeight(1);
  rect(GRID_X, GRID_Y, COLS * CELL, ROWS * CELL, 6);
  stroke(25, 32, 55);
  for (let r = 0; r <= ROWS; r++) {
    line(GRID_X, GRID_Y + r * CELL, GRID_X + COLS * CELL, GRID_Y + r * CELL);
  }
  for (let c = 0; c <= COLS; c++) {
    line(GRID_X + c * CELL, GRID_Y, GRID_X + c * CELL, GRID_Y + ROWS * CELL);
  }
}

function drawGridCells() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c]) {
        drawBlock(GRID_X + c * CELL, GRID_Y + r * CELL, CELL, grid[r][c]);
      }
    }
  }
}

function drawTray() {
  const ty = GRID_Y + ROWS * CELL + TRAY_GAP;
  fill(14, 18, 34);
  noStroke();
  rect(GRID_X - 4, ty - 8, COLS * CELL + 8, TRAY_HEIGHT, 8);
  const slotW = (COLS * CELL) / 3;
  for (let i = 0; i < 3; i++) {
    const piece = tray[i];
    if (!piece) continue;
    const sx = GRID_X + i * slotW + slotW / 2;
    const sy = ty + TRAY_HEIGHT / 2;
    const { shape, color: col } = piece;
    const pcols = shape[0].length, prows = shape.length;
    const bsz = CELL * PIECE_SCALE;
    const ox = sx - pcols * bsz / 2;
    const oy = sy - prows * bsz / 2;
    for (let r = 0; r < prows; r++) {
      for (let c = 0; c < pcols; c++) {
        if (shape[r][c]) {
          drawBlock(ox + c * bsz, oy + r * bsz, bsz, col);
        }
      }
    }
  }
}

function drawDraggingPiece() {
  const { shape, color: col } = dragging;
  const pcols = shape[0].length, prows = shape.length;
  const bsz = CELL;
  const ox = mouseX - pcols * bsz / 2;
  const oy = mouseY - prows * bsz / 2 - bsz * 0.8;
  for (let r = 0; r < prows; r++) {
    for (let c = 0; c < pcols; c++) {
      if (shape[r][c]) {
        drawBlock(ox + c * bsz, oy + r * bsz, bsz, col, true);
      }
    }
  }
}

function drawDragPreview() {
  if (!dragging) return;
  const pos = getGridPos(mouseX, mouseY, dragging.shape);
  if (!pos) return;
  const canPlace = canPlaceAt(dragging.shape, pos.r, pos.c);
  const alpha = canPlace ? 160 : 60;
  const c = color(dragging.color);
  noStroke();
  for (let r = 0; r < dragging.shape.length; r++) {
    for (let cc = 0; cc < dragging.shape[r].length; cc++) {
      if (dragging.shape[r][cc]) {
        const px = GRID_X + (pos.c + cc) * CELL;
        const py = GRID_Y + (pos.r + r) * CELL;
        fill(red(c), green(c), blue(c), alpha);
        rect(px + 3, py + 3, CELL - 6, CELL - 6, 4);
        if (canPlace) {
          fill(255, 255, 255, 40);
          rect(px + 3, py + 3, CELL - 6, (CELL - 6) * 0.4, 4, 4, 0, 0);
        }
      }
    }
  }
}

function drawFlashLines() {
  if (flashTimer <= 0 || flashLines.length === 0) return;
  flashTimer--;
  const alpha = map(flashTimer, 0, 20, 0, 220);
  noStroke();
  fill(255, 255, 255, alpha);
  for (const fl of flashLines) {
    if (fl.type === 'row') {
      rect(GRID_X, GRID_Y + fl.idx * CELL, COLS * CELL, CELL);
    } else {
      rect(GRID_X + fl.idx * CELL, GRID_Y, CELL, ROWS * CELL);
    }
  }
  if (flashTimer === 0) clearLines();
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.life--;
    p.alpha = map(p.life, 0, p.maxLife, 0, 220);
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    noStroke();
    fill(red(p.col), green(p.col), blue(p.col), p.alpha);
    if (p.type === 'square') {
      rect(p.x, p.y, p.sz, p.sz, 2);
    } else {
      ellipse(p.x, p.y, p.sz, p.sz);
    }
  }
}

function spawnParticles(gridR, gridC, col) {
  const cx = GRID_X + gridC * CELL + CELL / 2;
  const cy = GRID_Y + gridR * CELL + CELL / 2;
  for (let i = 0; i < 12; i++) {
    const angle = random(TWO_PI);
    const spd = random(2, 7);
    particles.push({
      x: cx, y: cy,
      vx: cos(angle) * spd,
      vy: sin(angle) * spd - 2,
      col: color(col),
      sz: random(5, 12),
      life: random(25, 50),
      maxLife: 50,
      alpha: 220,
      type: random() > 0.5 ? 'square' : 'circle'
    });
  }
}

//Input Handling
function mousePressed() {
  if (!audioCtxStarted) {
    getAudioContext().resume();
    audioCtxStarted = true;
  }

  if (gameState === 'menu') {
    gameState = 'play';
    return;
  }
  if (gameState === 'gameover') {
    if (isInsideButton(buttons.goRetry, mouseX, mouseY)) {
      initGame();
      gameState = 'play';
      return;
    }
    if (isInsideButton(buttons.goMenu, mouseX, mouseY)) {
      gameState = 'menu';
      return;
    }
    initGame();
    gameState = 'play';
    return;
  }

  if (gameState === 'play') {
    if (paused) {
      if (isInsideButton(buttons.resume, mouseX, mouseY)) {
        paused = false;
      } else if (isInsideButton(buttons.pauseMenu, mouseX, mouseY)) {
        paused = false;
        gameState = 'menu';
      }
      return;
    }

    if (showSettings) {
      if (mouseX > width/2-60 && mouseX < width/2+60 &&
          mouseY > height/2-37 && mouseY < height/2-3) {
        soundEnabled = !soundEnabled;
        return;
      }
      if (mouseX > width/2-60 && mouseX < width/2+60 &&
          mouseY > height/2+3 && mouseY < height/2+37) {
        highScore = 0;
        saveStats();
        return;
      }
      if (mouseX > width/2-60 && mouseX < width/2+60 &&
          mouseY > height/2+43 && mouseY < height/2+77) {
        showSettings = false;
        return;
      }
      showSettings = false;
      return;
    }

    //Main control bar buttons
    if (isInsideButton(buttons.pause, mouseX, mouseY)) { paused = true; return; }
    if (isInsideButton(buttons.retry, mouseX, mouseY)) { initGame(); return; }
    if (isInsideButton(buttons.settings, mouseX, mouseY)) { showSettings = true; return; }
    if (isInsideButton(buttons.sound, mouseX, mouseY)) { soundEnabled = !soundEnabled; return; }
    if (isInsideButton(buttons.menu, mouseX, mouseY)) { gameState = 'menu'; return; }  // NEW

    //Tray pickup
    const ty = GRID_Y + ROWS * CELL + TRAY_GAP;
    const slotW = (COLS * CELL) / 3;
    for (let i = 0; i < 3; i++) {
      if (!tray[i]) continue;
      const sx = GRID_X + i * slotW;
      if (mouseX >= sx && mouseX < sx + slotW &&
          mouseY >= ty - 8 && mouseY < ty - 8 + TRAY_HEIGHT) {
        dragging = { idx: i, shape: tray[i].shape, color: tray[i].color };
        break;
      }
    }
  }
}

function mouseReleased() {
  if (gameState !== 'play' || paused || showSettings) {
    dragging = null;
    return;
  }
  if (!dragging) return;
  const pos = getGridPos(mouseX, mouseY, dragging.shape);
  if (pos && canPlaceAt(dragging.shape, pos.r, pos.c)) {
    placePiece(dragging.shape, dragging.color, pos.r, pos.c);
    tray[dragging.idx] = null;
    refillTray();
    playPlaceSound();
    checkForLines();
    if (isGameOver()) {
      if (score > highScore) highScore = score;
      updatePersistentStats();
      gameState = 'gameover';
      playGameOverSound();
    }
  }
  dragging = null;
}

function keyPressed() {
  if (keyCode === ENTER) {
    if (gameState === 'menu') gameState = 'play';
    else if (gameState === 'gameover') { initGame(); gameState = 'play'; }
  }
  if (key === 'r' || key === 'R') {
    if (gameState === 'play') initGame();
  }
  if (key === 'p' || key === 'P') {
    if (gameState === 'play') paused = !paused;
  }
  if (key === 's' || key === 'S') {
    if (gameState === 'play') soundEnabled = !soundEnabled;
  }
  if (key === 'm' || key === 'M') {
    if (gameState === 'play') { paused = false; gameState = 'menu'; }
  }
}

//Sound
function playPlaceSound() {
  if (!soundEnabled) return;
  let osc = new p5.Oscillator('sine');
  osc.freq(600); osc.amp(0.3); osc.start();
  osc.amp(0, 0.08); osc.stop(0.12);
}
function playClearSound() {
  if (!soundEnabled) return;
  let osc = new p5.Oscillator('triangle');
  osc.freq(800); osc.amp(0.4); osc.start();
  osc.freq(1200, 0.1); osc.amp(0, 0.2); osc.stop(0.25);
}
function playComboSound() {
  if (!soundEnabled) return;
  let notes = [600, 800, 1000];
  for (let i = 0; i < notes.length; i++) {
    let osc = new p5.Oscillator('sine');
    osc.freq(notes[i]); osc.amp(0.2); osc.start(i * 0.08);
    osc.stop(i * 0.08 + 0.15);
  }
}
function playGameOverSound() {
  if (!soundEnabled) return;
  let osc = new p5.Oscillator('sawtooth');
  osc.freq(300); osc.amp(0.3); osc.start();
  osc.freq(100, 0.5); osc.amp(0, 0.5); osc.stop(0.6);
}

//Grid & Placement Logic
function getGridPos(mx, my, shape) {
  const bsz = CELL;
  const pcols = shape[0].length, prows = shape.length;
  const ox = mx - pcols * bsz / 2;
  const oy = my - prows * bsz / 2 - bsz * 0.8;
  const c = Math.round((ox - GRID_X) / CELL);
  const r = Math.round((oy - GRID_Y) / CELL);
  return { r, c };
}
function canPlaceAt(shape, startR, startC) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const gr = startR + r, gc = startC + c;
        if (gr < 0 || gr >= ROWS || gc < 0 || gc >= COLS) return false;
        if (grid[gr][gc]) return false;
      }
    }
  }
  return true;
}
function placePiece(shape, col, startR, startC) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) grid[startR + r][startC + c] = col;
    }
  }
  const cells = shape.flat().filter(v => v).length;
  addScore(cells * 5);
}

//Line Clearing & Combo
function checkForLines() {
  const toFlash = [];
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every(v => v !== 0)) toFlash.push({ type: 'row', idx: r });
  }
  for (let c = 0; c < COLS; c++) {
    if (grid.every(row => row[c] !== 0)) toFlash.push({ type: 'col', idx: c });
  }

  if (toFlash.length > 0) {
    flashLines = toFlash;
    flashTimer = 22;
    for (const fl of toFlash) {
      if (fl.type === 'row') {
        for (let c = 0; c < COLS; c++) spawnParticles(fl.idx, c, grid[fl.idx][c]);
      } else {
        for (let r = 0; r < ROWS; r++) spawnParticles(r, fl.idx, grid[r][fl.idx]);
      }
    }
    combo++;
    comboTimer = 90;
    shakeTimer = 12;
    shakeAmt = combo > 1 ? 6 : 3;
    let pts = toFlash.length * 100 * combo;
    if (toFlash.length >= 3) pts = floor(pts * 1.5);
    addScore(pts);
    linesCleared += toFlash.length;
    level = 1 + floor(linesCleared / 5);
    playClearSound();
    if (combo > 1) playComboSound();
  } else {
    combo = 0;
  }
}
function clearLines() {
  for (const fl of flashLines) {
    if (fl.type === 'row') {
      grid[fl.idx] = Array(COLS).fill(0);
    } else {
      for (let r = 0; r < ROWS; r++) grid[r][fl.idx] = 0;
    }
  }
  flashLines = [];
}
function addScore(pts) {
  score += pts;
  if (score > highScore) highScore = score;
}
function isGameOver() {
  for (const piece of tray) {
    if (!piece) continue;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlaceAt(piece.shape, r, c)) return false;
      }
    }
  }
  return true;
}