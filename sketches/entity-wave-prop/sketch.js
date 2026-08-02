let cols, rows, cur, prev;

// DAMP: wave damping factor. closer to 1 implies that longer-lasting ripples, lower means that ripples die quickly
const DAMP = 0.955;
const CHARS = " .'`~:;-=+*#%&@";
const WHALE = [
  '       .                   ',
  '      ":"                  ',
  '    ___:____     |"\\/"|      ',
  "  ,'        `.    \\  /      ",
  '  |  O        \\___/  |      ',
  '~^~^~^~^~^~^~^~^~^~^~^~^~',
];
// WHALE made by Riitta Rasimus, shared on Textmode EU

function precomputeCols(art) {
  const h = art.length;
  const w = Math.max(...art.map((l) => l.length));
  const cols = [];
  for (let fx = 0; fx < w; fx++) {
    const col = [];
    for (let fy = 0; fy < h; fy++) {
      const ch = art[fy][fx];
      if (ch && ch !== ' ') col.push({ ch, vert: fy - Math.floor(h / 2) });
    }
    if (col.length) cols.push(col);
  }
  return { cols, h, w };
}

const whaleData = precomputeCols(WHALE);

let whaleTrail = [];
// TRAIL_LEN: how many past positions to remember. longer = longer visible body, shorter = stubby whale
const TRAIL_LEN = 80;

function init() {
  cols = t.grid.cols;
  rows = t.grid.rows;
  cur = new Float32Array(cols * rows);
  prev = new Float32Array(cols * rows);
  whaleTrail = [];
}

function drop(x, y, force) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 1 || x >= cols - 1 || y < 1 || y >= rows - 1) return;
  const i = y * cols + x;
  cur[i] += force;
  if (x > 1) cur[i - 1] += force * 0.4;
  if (x < cols - 2) cur[i + 1] += force * 0.4;
  if (y > 1) cur[i - cols] += force * 0.35;
  if (y < rows - 2) cur[i + cols] += force * 0.35;
}

t.fontSize(16);

t.setup(() => {
  init();
});

t.draw(() => {
  if (!cur) return;
  const time = t.frameCount / 60;

  const sx =
    Math.sin(time * 0.7) * (cols * 0.38) +
    Math.sin(time * 1.9 + 1.2) * (cols * 0.12);
  const sy =
    Math.cos(time * 0.5) * (rows * 0.35) +
    Math.cos(time * 1.7 + 0.8) * (rows * 0.1);

  const headX = cols / 2 + sx;
  const headY = rows / 2 + sy;

  whaleTrail.unshift({ x: headX, y: headY });
  if (whaleTrail.length > TRAIL_LEN) whaleTrail.length = TRAIL_LEN;

  if (t.frameCount % 2 === 0) {
    drop(headX, headY, 4);
  }
  if (whaleTrail.length > 10 && t.frameCount % 4 === 0) {
    const tail = whaleTrail[Math.min(whaleTrail.length - 1, 30)];
    drop(tail.x, tail.y, 1.5);
  }

  const next = prev;
  for (let y = 1; y < rows - 1; y++) {
    const yo = y * cols;
    for (let x = 1; x < cols - 1; x++) {
      const i = yo + x;
      next[i] =
        ((cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols]) * 0.5 -
          prev[i]) *
        DAMP;
    }
  }
  for (let y = rows - 2; y >= 1; y--) {
    const yo = y * cols;
    for (let x = 1; x < cols - 1; x++) {
      next[yo + x] += next[(y - 1) * cols + x] * 0.01;
    }
  }
  prev = cur;
  cur = next;

  t.background(0);
  const hc = Math.floor(cols / 2);
  const hr = Math.floor(rows / 2);

  for (let y = 0; y < rows; y++) {
    const yo = y * cols;
    for (let x = 0; x < cols; x++) {
      const h = cur[yo + x];
      const a = Math.abs(h);
      if (a < 0.06) continue;

      const ci = Math.min(Math.floor(a * 2.0), CHARS.length - 1);
      const bright = Math.min(a * 50, 255);
      const r = Math.min(bright * 0.2, 80);
      const g = Math.min(bright * 0.55 + 30, 255);
      const b = Math.min(bright * 1.0 + 60, 255);

      t.char(CHARS[ci]);
      t.charColor(r, g, b);
      t.cellColor(0, Math.min(a * 4, 18), Math.min(a * 10, 40));
      t.translate(x - hc, y - hr);
      t.rect(1, 1);
      t.translate(-(x - hc), -(y - hr));
    }
  }

  const artCols = whaleData.cols;
  const spacing = 1.8;
  for (let col = 0; col < artCols.length; col++) {
    const trailPos = Math.floor(col * spacing);
    if (trailPos >= whaleTrail.length) break;
    const pos = whaleTrail[trailPos];
    const fade = 1.0 - (col / artCols.length) * 0.7;

    for (const { ch, vert } of artCols[col]) {
      const gx = Math.round(pos.x);
      const gy = Math.round(pos.y) + vert;

      const bright = 160 * fade;
      const r = bright * 0.12;
      const g = Math.min(bright * 0.55 + 40, 190);
      const b = Math.min(bright + 70, 255);

      t.char(ch);
      t.charColor(r, g, b);
      t.cellColor(0, Math.floor(fade * 3), Math.floor(fade * 10));
      t.translate(gx - hc, gy - hr);
      t.rect(1, 1);
      t.translate(-(gx - hc), -(gy - hr));
    }
  }
});

t.windowResized(() => {
  init();
});
