#!/usr/bin/env node
/* redpen のアイコンを PNG で書き出す（外部依存なし）
 *   node scripts/make-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- PNG エンコーダ ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 図形（符号付き距離） ---------- */

function sdRoundedRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

/** 太さが両端で変わる線分（ペン軸 → ペン先） */
function sdTaperedSegment(px, py, ax, ay, bx, by, ra, rb) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  const r = ra + (rb - ra) * t;
  return Math.hypot(wx - vx * t, wy - vy * t) - r;
}

const BLUE = [37, 99, 235];    // 背景
const WHITE = [255, 255, 255]; // ペン
const AMBER = [250, 204, 21];  // 引いた線（コメントのハイライト色）

/** 1 ピクセル分の色を求める（S×S のスーパーサンプリング） */
function shade(x, y, size, S) {
  let r = 0, g = 0, b = 0, a = 0;
  for (let sy = 0; sy < S; sy++) {
    for (let sx = 0; sx < S; sx++) {
      const px = x + (sx + 0.5) / S;
      const py = y + (sy + 0.5) / S;
      const u = px / size;
      const v = py / size;

      // 背景の角丸四角
      const bg = sdRoundedRect(u, v, 0.5, 0.5, 0.5, 0.5, 0.235);
      const bgA = bg <= 0 ? 1 : 0;

      let cr = BLUE[0], cg = BLUE[1], cb = BLUE[2];

      // ペン軸（右上 → 左下に向かって細くなる）
      const pen = sdTaperedSegment(u, v, 0.70, 0.19, 0.355, 0.585, 0.088, 0.012);
      // 引いた線
      const rule = sdSegment(u, v, 0.235, 0.775, 0.765, 0.775) - 0.043;

      if (pen <= 0) {
        cr = WHITE[0]; cg = WHITE[1]; cb = WHITE[2];
      } else if (rule <= 0) {
        cr = AMBER[0]; cg = AMBER[1]; cb = AMBER[2];
      }
      if (bgA) {
        r += cr; g += cg; b += cb; a += 255;
      }
    }
  }
  const n = S * S;
  if (a === 0) return [0, 0, 0, 0];
  // 背景内のサンプルだけで色を平均する（縁が黒ずむのを避ける）
  const covered = a / 255;
  return [Math.round(r / covered), Math.round(g / covered), Math.round(b / covered), Math.round(a / n)];
}

function renderIcon(size) {
  const S = size >= 64 ? 3 : 5;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = shade(x, y, size, S);
      const i = (y * size + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }
  return encodePng(size, size, buf);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, renderIcon(size));
  console.log('wrote', path.relative(process.cwd(), file));
}
