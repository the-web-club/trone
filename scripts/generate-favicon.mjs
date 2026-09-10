import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BG = [0x35, 0x35, 0x3c];
const FG = [0xed, 0x78, 0x45];

function drawMark(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = size * 0.54;
  const outer = size * 0.34;
  const inner = size * 0.2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const onRing = dist <= outer && dist >= inner;
      const [r, g, b] = onRing ? FG : BG;
      const offset = ((size - 1 - y) * size + x) * 4;
      pixels[offset] = b;
      pixels[offset + 1] = g;
      pixels[offset + 2] = r;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function bmpIcon(size, pixels) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(pixels.length, 20);
  const maskRow = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRow * size);
  return Buffer.concat([header, pixels, mask]);
}

function buildIco(sizes) {
  const images = sizes.map((size) => bmpIcon(size, drawMark(size)));
  const dir = Buffer.alloc(6 + 16 * images.length);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(images.length, 4);
  let offset = dir.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    const size = sizes[index];
    dir.writeUInt8(size === 256 ? 0 : size, entry);
    dir.writeUInt8(size === 256 ? 0 : size, entry + 1);
    dir.writeUInt8(0, entry + 2);
    dir.writeUInt8(0, entry + 3);
    dir.writeUInt16LE(1, entry + 4);
    dir.writeUInt16LE(32, entry + 6);
    dir.writeUInt32LE(image.length, entry + 8);
    dir.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([dir, ...images]);
}

const out = join(dirname(fileURLToPath(import.meta.url)), "../src/app/favicon.ico");
writeFileSync(out, buildIco([16, 32]));
console.log("Wrote", out);
