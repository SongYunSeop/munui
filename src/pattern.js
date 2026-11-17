import { defaultStyle } from './style.js';

const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
const luminance = values => values
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);

export function createCoverPattern(hash, options = {}) {
  const palette = { pixels: options.pixels || defaultStyle.pixels };
  let state = (new DataView(hash.buffer, hash.byteOffset, hash.byteLength).getUint32(4, true) ^ (options.seed || 0)) || 1;
  const random = max => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % max;
  };
  if (options.colorCandidates) {
    const candidates = [...options.colorCandidates];
    for (let index = candidates.length - 1; index > 0; index--) {
      const other = (hash[(index + 16) % hash.length] + (options.seed || 0)) % (index + 1);
      [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
    }
    palette.pixels = candidates.slice(0, options.colorCount || palette.pixels.length);
  }
  const automatic = options.colorMode === 'auto';
  const character = (hash[8] + (options.seed || 0)) % 4;
  const colorOrder = palette.pixels.map((_, index) => index);
  if (automatic) for (let index = colorOrder.length - 1; index > 0; index--) {
    const other = (hash[(index + 12) % hash.length] + (options.seed || 0)) % (index + 1);
    [colorOrder[index], colorOrder[other]] = [colorOrder[other], colorOrder[index]];
  }
  const seeds = [];
  const tiles = [];
  const covered = new Set();
  const cells = (cell, size) => Array.from({ length: size * size }, (_, index) => cell + index % size + Math.floor(index / size) * 60);
  // Fill the 60×40 grid of 4-unit cells with squares, row by row, each as large as fits up to maxSize.
  for (let cell = 0; cell < 2400; cell++) {
    if (covered.has(cell)) continue;
    const maximum = options.maxSize || 6;
    let limit = maximum;
    if (automatic && character === 1) limit = Math.ceil(maximum / 2);
    if (automatic && character === 2) {
      const flow = (Math.sin(cell % 60 / 60 * Math.PI * 2 + hash[10]) + 1) / 2;
      limit = 1 + Math.round((maximum - 1) * flow);
    }
    let size = 1 + random(limit);
    if (automatic && character === 0) size = Math.max(size, 1 + random(limit));
    while (size > 1 && (cell % 60 + size > 60 || Math.floor(cell / 60) + size > 40 || cells(cell, size).some(next => covered.has(next)))) size--;
    cells(cell, size).forEach(next => covered.add(next));
    tiles.push({ x: cell % 60 * 4, y: Math.floor(cell / 60) * 4, width: size * 4, height: size * 4 });
  }
  if (options.colorMode === 'groups' || automatic) seeds.push(...palette.pixels.map(() => random(2400)));
  // Keep color proportions fixed, but shuffle so no repeating stripes appear in space.
  for (let index = tiles.length - 1; index > 0; index--) {
    const other = random(index + 1);
    [tiles[index], tiles[other]] = [tiles[other], tiles[index]];
  }
  tiles.forEach((block, index) => {
    const value = (index * 37 + hash[3]) % 100;
    let tone = value < 65 ? 0 : value < 85 ? 1 : value < 97 ? 2 : 3;
    if (palette.pixels.length !== 4 || options.accentShare != null && options.accentShare !== .15) {
      const primary = Math.round((1 - (options.accentShare ?? .15)) * 100);
      tone = palette.pixels.length === 2 ? value < 65 ? 0 : 1 : value < primary ?
        value < primary * 65 / 85 ? 0 : 1 :
        2 + Math.min(palette.pixels.length - 3, Math.floor((value - primary) / (100 - primary) * (palette.pixels.length - 2)));
    }
    if (automatic) {
      const x = (block.x + block.width / 2) / 240;
      const y = (block.y + block.height / 2) / 160;
      let field = ((index * 61 + hash[11]) % 100) / 100;
      if (hash[9] % 3 === 1) field = (Math.sin(x * 7 + y * 5 + hash[10]) + 1) / 2;
      if (hash[9] % 3 === 2) {
        const closest = seeds.reduce((best, seed, index) => {
          const distance = Math.hypot(x * 60 - seed % 60, y * 40 - Math.floor(seed / 60));
          return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity });
        field = closest.index / palette.pixels.length;
      }
      const primary = 1 - (options.accentShare ?? .15);
      tone = palette.pixels.length === 2 ? Math.min(1, Math.floor(field * 2)) :
        value / 100 < primary ? Math.min(1, Math.floor(field * 2)) :
          2 + Math.min(palette.pixels.length - 3, Math.floor(field * (palette.pixels.length - 2)));
      tone = colorOrder[tone % colorOrder.length];
    } else if (options.colorMode === 'groups') {
      const closest = seeds.reduce((best, seed, index) => {
        const distance = Math.hypot(block.x / 4 - seed % 60, block.y / 4 - Math.floor(seed / 60));
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity });
      tone = closest.index % palette.pixels.length;
    } else if (options.colorMode === 'bands') tone = Math.min(palette.pixels.length - 1, Math.floor(block.x / (240 / palette.pixels.length)));
    else if (options.colorMode) {
      // Pattern modes color by position along a shape; accentShare doesn't apply. Their shape comes from the hash, not the RNG.
      const count = palette.pixels.length, cx = block.x + block.width / 2, cy = block.y + block.height / 2;
      if (options.colorMode === 'waves') tone = Math.floor(cy / 160 * count + Math.sin(cx / 240 * Math.PI * 3 + hash[10]) * .9);
      if (options.colorMode === 'rings') tone = Math.floor(Math.hypot(cx - (60 + hash[13] % 121), cy - (40 + hash[14] % 81)) / 18);
      if (options.colorMode === 'diagonal') tone = Math.floor(((hash[15] % 2 ? cx : 240 - cx) + cy) / 400 * count);
      if (options.colorMode === 'rows') tone = Math.floor(cy / 160 * count);
      tone = (tone % count + count) % count;
    }
    block.color = palette.pixels[tone % palette.pixels.length]; // tone can pass the end only for a one-color palette
  });
  // Title color: the given ink, or black or white, whichever contrasts more with the cover's average brightness.
  const area = tiles.reduce((sum, block) => sum + block.width * block.height, 0);
  const value = tiles.reduce((sum, block) => sum + luminance(rgb(block.color)) * block.width * block.height, 0) / area;
  const ink = options.ink || ((value + .05) / .05 >= 1.05 / (value + .05) ? '#000000' : '#ffffff');
  return { ink, blocks: tiles };
}
