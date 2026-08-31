// Generates the PWA launcher icons as PNGs, so the repo carries no binary
// assets that can't be regenerated. Run with: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x2f, 0x6f, 0xe4];
const FG = [0xff, 0xff, 0xff];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const png = (size, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour with alpha
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// The mark: a play triangle (start a sprint) on a rounded square.
const draw = (size, { radius, inset }) => {
  const buf = Buffer.alloc(size * size * 4);
  const S = 3; // supersampling factor
  const box = { x0: size * inset, y0: size * inset, x1: size * (1 - inset), y1: size * (1 - inset) };
  const r = radius * (box.x1 - box.x0);
  const side = (box.y1 - box.y0) * 0.30;
  // Optically centre the triangle: its bounding box runs -0.62..+0.78 of `side`.
  const cx = (box.x0 + box.x1) / 2 - side * 0.08;
  const cy = (box.y0 + box.y1) / 2;
  const tri = [
    [cx - side * 0.62, cy - side],
    [cx - side * 0.62, cy + side],
    [cx + side * 0.78, cy],
  ];
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inTriangle = (px, py) => {
    const c1 = cross(tri[0], tri[1], [px, py]);
    const c2 = cross(tri[1], tri[2], [px, py]);
    const c3 = cross(tri[2], tri[0], [px, py]);
    return (c1 >= 0 && c2 >= 0 && c3 >= 0) || (c1 <= 0 && c2 <= 0 && c3 <= 0);
  };
  const inRounded = (px, py) => {
    if (px < box.x0 || px > box.x1 || py < box.y0 || py > box.y1) return false;
    const qx = Math.min(Math.max(px, box.x0 + r), box.x1 - r);
    const qy = Math.min(Math.max(py, box.y0 + r), box.y1 - r);
    return (px - qx) ** 2 + (py - qy) ** 2 <= r * r;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          if (inRounded(px, py)) {
            bg++;
            if (inTriangle(px, py)) fg++;
          }
        }
      }
      const total = S * S;
      const i = (y * size + x) * 4;
      const alpha = bg / total;
      const mix = fg / total;
      for (let c = 0; c < 3; c++) {
        buf[i + c] = Math.round(BG[c] * (1 - mix) + FG[c] * mix);
      }
      buf[i + 3] = Math.round(alpha * 255);
    }
  }
  return buf;
};

mkdirSync('public/icons', { recursive: true });
const targets = [
  ['public/icons/icon-192.png', 192, { radius: 0.22, inset: 0 }],
  ['public/icons/icon-512.png', 512, { radius: 0.22, inset: 0 }],
  // Maskable art must survive a circular crop, so it keeps a 10% safe margin.
  ['public/icons/maskable-512.png', 512, { radius: 0.5, inset: 0.1 }],
];
for (const [path, size, opts] of targets) {
  writeFileSync(path, png(size, draw(size, opts)));
  console.log('wrote', path);
}
