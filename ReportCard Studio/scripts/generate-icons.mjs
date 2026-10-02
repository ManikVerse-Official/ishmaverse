/*
 * Generates the PWA icons (192 / 512 / maskable 512) plus a crisp SVG logo.
 *
 * No image libraries are used: a tiny PNG encoder (zlib + CRC32) rasterises a
 * simple report-card mark — a white card with text lines and a rising gold bar
 * chart — on the brand navy background.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const NAVY = [30, 58, 138];
const WHITE = [255, 255, 255];
const GOLD = [245, 158, 11];
const LINE = [148, 163, 184];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Simple RGBA canvas with the few primitives this mark needs. */
function createCanvas(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const put = (x, y, [r, g, b], alpha = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    const a = alpha / 255;
    pixels[offset] = Math.round(pixels[offset] * (1 - a) + r * a);
    pixels[offset + 1] = Math.round(pixels[offset + 1] * (1 - a) + g * a);
    pixels[offset + 2] = Math.round(pixels[offset + 2] * (1 - a) + b * a);
    pixels[offset + 3] = Math.max(pixels[offset + 3], Math.round(255 * a));
  };
  return {
    pixels,
    fill(color) {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, color);
    },
    roundedRect(x, y, w, h, radius, color) {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const dx = px < x + radius ? x + radius - px : px >= x + w - radius ? px - (x + w - radius - 1) : 0;
          const dy = py < y + radius ? y + radius - py : py >= y + h - radius ? py - (y + h - radius - 1) : 0;
          if (dx * dx + dy * dy > radius * radius) continue;
          put(px, py, color);
        }
      }
    },
    rect(x, y, w, h, color) {
      for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) put(px, py, color);
    },
  };
}

/**
 * Draw the mark on a 512-unit design grid.
 * `artworkScale` shrinks the artwork into the maskable safe zone (Android may
 * crop up to 20% on each side for maskable icons).
 */
function drawIcon(size, artworkScale = 1) {
  const canvas = createCanvas(size);
  canvas.fill(NAVY);

  const scaleFactor = (size / 512) * artworkScale;
  const offset = (size - 512 * scaleFactor) / 2;
  const X = (value) => Math.round(value * scaleFactor + offset);
  const S = (value) => Math.max(1, Math.round(value * scaleFactor));

  /* Report card sheet with text lines. */
  canvas.roundedRect(X(122), X(98), S(266), S(316), S(26), WHITE);
  const lines = [
    [160, 140, 190],
    [160, 176, 190],
    [160, 212, 118],
  ];
  for (const [x, y, w] of lines) {
    canvas.rect(X(x), X(y), S(w), S(12), LINE);
  }

  /* Rising gold bars = improving performance. */
  const bars = [
    [160, 300, 72],
    [222, 272, 100],
    [284, 244, 128],
  ];
  for (const [x, y, h] of bars) {
    canvas.rect(X(x), X(y), S(46), S(h), GOLD);
  }

  return encodePng(size, size, canvas.pixels);
}

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="ReportCard Studio">
  <rect width="512" height="512" rx="96" fill="#1e3a8a"/>
  <rect x="122" y="98" width="266" height="316" rx="26" fill="#ffffff"/>
  <rect x="160" y="140" width="190" height="12" rx="6" fill="#94a3b8"/>
  <rect x="160" y="176" width="190" height="12" rx="6" fill="#94a3b8"/>
  <rect x="160" y="212" width="118" height="12" rx="6" fill="#94a3b8"/>
  <rect x="160" y="300" width="46" height="72" rx="10" fill="#f59e0b"/>
  <rect x="222" y="272" width="46" height="100" rx="10" fill="#f59e0b"/>
  <rect x="284" y="244" width="46" height="128" rx="10" fill="#f59e0b"/>
</svg>
`;

const targetDir = resolve(process.cwd(), 'public/icons');
mkdirSync(targetDir, { recursive: true });

writeFileSync(resolve(targetDir, 'icon-192.png'), drawIcon(192));
writeFileSync(resolve(targetDir, 'icon-512.png'), drawIcon(512));
writeFileSync(resolve(targetDir, 'icon-maskable-512.png'), drawIcon(512, 0.8));
writeFileSync(resolve(targetDir, 'icon.svg'), SVG);
writeFileSync(resolve(process.cwd(), 'public/favicon.svg'), SVG);

console.log('Wrote public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, icon.svg and public/favicon.svg');
