import { createCoverPattern } from './pattern.js';
import { defaultStyle } from './style.js';

export { createCoverPattern } from './pattern.js';
export { defaultStyle, mutedColorCandidates, themes } from './style.js';

/**
 * SHA-256 of the NFC-normalized text, so composed and decomposed Hangul give the same cover.
 * A salt (e.g. your site name) is prepended with a NUL separator, giving your site its own covers for the same text.
 */
export async function hashText(text, salt = '') {
  const input = (salt ? `${String(salt).normalize('NFC')}\0` : '') + text.normalize('NFC');
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
}

/** Same text (and options.salt) always gives the same cover. Returns { ink, blocks: [{ x, y, width, height, color }] }: squares filling a 240×160 grid, and a title color for it. */
export async function createCover(text, options = defaultStyle) {
  return createCoverPattern(await hashText(text, options.salt), options);
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

/** Standalone SVG string. The cover grid is 240×160; viewBox can crop it (e.g. '0 17 240 126' for 1200×630). */
export function coverToSvg(cover, { width = 240, height = 160, viewBox = '0 0 240 160' } = {}) {
  // Numbers go through Number() and strings through escape(), so a cover read from untrusted JSON can't inject markup.
  const pixels = cover.blocks.map(block => `<rect x="${+block.x}" y="${+block.y}" width="${+block.width}" height="${+block.height}" fill="${escape(block.color)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${+width}" height="${+height}" viewBox="${escape(viewBox)}" shape-rendering="crispEdges">${pixels}</svg>`;
}
