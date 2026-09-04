// Generates the PWA launcher icons as PNGs, so the repo carries no binary
// assets that can't be regenerated. Run with: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// Sampled from the reference artwork: a raspberry red in the same family as
// Apple Music's and Airbnb's marks — saturated enough to hold its own in a
// home-screen grid without going orange.
const BG = [0xd9, 0x2f, 0x5e];
const FG = [0xff, 0xf7, 0xfa];

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

// The mark: a lightning bolt, drawn as a stroked polyline the way the
// reference is — a single unbroken line rather than a filled glyph. It reads as
// speed at any size, which a letterform would not once it is 60px on a phone.
const draw = (size, { radius, inset }) => {
  const buf = Buffer.alloc(size * size * 4);
  const S = 4; // supersampling factor
  const box = { x0: size * inset, y0: size * inset, x1: size * (1 - inset), y1: size * (1 - inset) };
  const r = radius * (box.x1 - box.x0);
  const span = box.x1 - box.x0;

  // Bolt path in 0..1 space, centred, then scaled into the safe box.
  const pts = [
    [0.67, 0.12],
    [0.33, 0.51],
    [0.53, 0.51],
    [0.35, 0.88],
  ].map(([x, y]) => [box.x0 + x * span, box.y0 + y * span]);
  const stroke = span * 0.055;

  const distToSegment = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const onBolt = (px, py) => {
    // Open polyline with round caps and joins, as the reference is drawn —
    // closing it back to the start would cut a stray diagonal through the mark.
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(px, py, pts[i], pts[i + 1]) <= stroke / 2) return true;
    }
    return false;
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
            if (onBolt(px, py)) fg++;
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
