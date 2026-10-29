import { paletteByChar } from "./palette";
import type { SpriteGrid } from "./sprites/types";

/**
 * Room fills. Each tile is 16×16 palette cells, drawn at ×4 (64 CSS px)
 * with image-rendering: pixelated. Hard pixels only — no interpolated fades.
 * Walls stay in night / slate / darkwood. Floors and desk grain stay in wood / darkwood.
 * School accent is not a room fill.
 */
export const MATERIAL_CELL = 16;
export const MATERIAL_SCALE = 4;
export const materialSizePx = MATERIAL_CELL * MATERIAL_SCALE;

export const materialNames = ["plaster", "wainscot", "floor", "desk", "panel"] as const;
export type MaterialName = (typeof materialNames)[number];

/** Work and School share one study-hall fill. School accent stays off the wall. */
export const studyRoomFill = {
  wall: "plaster",
  wainscot: "wainscot",
  floor: "floor",
  desk: "desk",
} as const;

/** Curriculum colour is allowed on the path book and the school apron rail only. */
export const schoolAccentSurfaces = ["book", "apron-rail"] as const;

const plaster: SpriteGrid = [
  "nnnnnnssnnnnnnnn",
  "nnnnnnssnnnnnnnn",
  "nnnnnnnnnnnnssnn",
  "nnnnnnnnnnnnssnn",
  "ssnnnnnnnnnnnnnn",
  "ssnnnnnnnnnnnnnn",
  "nnnnssnnnnnnnnnn",
  "nnnnssnnnnnnnnnn",
  "nnnnnnnnnnssnnnn",
  "nnnnnnnnnnssnnnn",
  "nnnnnnnnnnnnnnss",
  "nnnnnnnnnnnnnnss",
  "nnnnnnnnssnnnnnn",
  "nnnnnnnnssnnnnnn",
  "nnnnssnnnnnnnnnn",
  "nnnnssnnnnnnnnnn",
];

const wainscot: SpriteGrid = [
  "wwwwwwwwwwwwwwww",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddndddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wddddddddddddddw",
  "wwwwwwwwwwwwwwww",
];

const floor: SpriteGrid = [
  "wwwwwwwwwwwwwwww",
  "wwwwdwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwdwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "dddddddddddddddd",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwdwww",
  "wwwwwwwwwwwwwwww",
  "wwdwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "dddddddddddddddd",
];

const desk: SpriteGrid = [
  "wwwwwwwwwwwwwwww",
  "wwdwwwwwwdwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwdwwwwwwdww",
  "wwwwwwwwwwwwwwww",
  "wdwwwwwwwwdwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwdwwwwwwwwdww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwdwwwwdwwww",
  "wwwwwwwwwwwwwwww",
  "dwwwwwwwwwwwwdww",
  "wwwwwwwwwwwwwwww",
  "wwwwdwwwwwwwwwww",
  "wwwwwwwwwwdwwwww",
  "wwwwwwwwwwwwwwww",
];

const panel: SpriteGrid = [
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwdwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwdwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwdwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwdwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
  "wwwwwwwwwwwwwwwd",
];

export const materialTiles: Record<MaterialName, SpriteGrid> = {
  plaster,
  wainscot,
  floor,
  desk,
  panel,
};

const ROOM_CHARS = new Set(["n", "s", "w", "d"]);

export function tileChars(name: MaterialName): string[] {
  return [...new Set(materialTiles[name].join(""))];
}

function gridRgba(rows: SpriteGrid): { width: number; height: number; rgba: Uint8Array } {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const row = rows[y] ?? "";
    for (let x = 0; x < width; x += 1) {
      const hex = paletteByChar[row[x] ?? "."];
      const i = (y * width + x) * 4;
      if (!hex) continue;
      rgba[i] = Number.parseInt(hex.slice(1, 3), 16);
      rgba[i + 1] = Number.parseInt(hex.slice(3, 5), 16);
      rgba[i + 2] = Number.parseInt(hex.slice(5, 7), 16);
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const chunks: number[] = [0x78, 0x01];
  let offset = 0;
  while (offset < data.length) {
    const len = Math.min(65535, data.length - offset);
    const last = offset + len >= data.length;
    const nlen = (~len) & 0xffff;
    chunks.push(last ? 1 : 0, len & 255, (len >> 8) & 255, nlen & 255, (nlen >> 8) & 255);
    for (let i = 0; i < len; i += 1) chunks.push(data[offset + i] ?? 0);
    offset += len;
  }
  const sum = adler32(data);
  chunks.push((sum >>> 24) & 255, (sum >>> 16) & 255, (sum >>> 8) & 255, sum & 255);
  return Uint8Array.from(chunks);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), row + 1);
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [signature, chunk("IHDR", ihdr), chunk("IDAT", zlibStore(raw)), chunk("IEND", new Uint8Array())];
  const len = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(len);
  let cursor = 0;
  for (const part of parts) {
    png.set(part, cursor);
    cursor += part.length;
  }
  return png;
}

function toBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = i + 1 < bytes.length ? (bytes[i + 1] ?? 0) : 0;
    const c = i + 2 < bytes.length ? (bytes[i + 2] ?? 0) : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return out;
}

const urlCache = new Map<MaterialName, string>();

export function materialUrl(name: MaterialName): string {
  const cached = urlCache.get(name);
  if (cached) return cached;
  const { width, height, rgba } = gridRgba(materialTiles[name]);
  const url = `url("data:image/png;base64,${toBase64(encodePng(width, height, rgba))}")`;
  urlCache.set(name, url);
  return url;
}

export function applyMaterials(root: HTMLElement) {
  root.style.setProperty("--mat-size", `${materialSizePx}px`);
  for (const name of materialNames) {
    root.style.setProperty(`--mat-${name}`, materialUrl(name));
  }
}

export function roomTileCharsAreEmber(name: MaterialName): boolean {
  return tileChars(name).every((ch) => ROOM_CHARS.has(ch));
}
