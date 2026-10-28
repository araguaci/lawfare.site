import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function insideRound(x, y, size, radius) {
  const dx = x < radius ? radius - x : x > size - radius ? x - (size - radius) : 0;
  const dy = y < radius ? radius - y : y > size - radius ? y - (size - radius) : 0;
  if (!dx && !dy) return true;
  return dx * dx + dy * dy <= radius * radius;
}

const BOLT = [
  [0.56, 0.16],
  [0.34, 0.54],
  [0.48, 0.54],
  [0.4, 0.86],
  [0.7, 0.42],
  [0.54, 0.42],
];

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : Math.round(size * 0.18);
  const pad = maskable ? size * 0.18 : size * 0.2;
  const bolt = BOLT.map(([x, y]) => [pad + x * (size - pad * 2), pad + y * (size - pad * 2)]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const onPlate = maskable || insideRound(x, y, size, radius);
      if (!onPlate) continue;
      rgba[i] = 8;
      rgba[i + 1] = 12;
      rgba[i + 2] = 20;
      rgba[i + 3] = 255;
      if (inPoly(x, y, bolt)) {
        rgba[i] = 244;
        rgba[i + 1] = 63;
        rgba[i + 2] = 94;
      }
      const barTop = size - pad - size * 0.035;
      const barBot = barTop + Math.max(3, size * 0.018);
      if (y >= barTop && y <= barBot && x >= pad && x <= size - pad) {
        rgba[i] = 16;
        rgba[i + 1] = 185;
        rgba[i + 2] = 129;
        rgba[i + 3] = 255;
      }
    }
  }
  return png(size, size, rgba);
}

const out = path.join(root, 'public/icons');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'icon-192.png'), drawIcon(192));
await writeFile(path.join(out, 'icon-512.png'), drawIcon(512));
await writeFile(path.join(out, 'icon-maskable-512.png'), drawIcon(512, { maskable: true }));
await writeFile(path.join(out, 'apple-touch-icon.png'), drawIcon(180, { maskable: true }));
console.log('[icons] public/icons atualizado');
