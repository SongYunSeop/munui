// Node only: renders an Open Graph PNG (1200×630) with the title over the cover. Requires the optional peer dependency `sharp`.
import sharp from 'sharp';
import { coverToSvg } from './index.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

/**
 * @param {object} input
 * @param {string} input.title
 * @param {object} input.cover  result of createCover / createCoverPattern
 * @param {string} [input.fontfile]  path to a .ttf/.otf; without it a system font is used (CI images often have none with Hangul)
 * @param {string} [input.font]  font family name inside fontfile, e.g. 'Noto Sans KR'
 * @param {number} [input.fontSize]  title size in px on the 1200×630 image; a title too big to fit is scaled down
 * @returns {Promise<Buffer>} PNG
 */
export async function createOgImage({ title, cover, fontfile, font = 'sans-serif', fontSize = 96 }) {
  // Crop the vertical center of the 3:2 cover so pixels stay square at 1200×630.
  const background = Buffer.from(coverToSvg(cover, { width: 1200, height: 630, viewBox: '0 17 240 126' }));
  const textOptions = { font: `${font} ${+fontSize}`, ...(fontfile ? { fontfile } : {}), align: 'center', wrap: 'word-char', rgba: true };
  const textImage = (text, width) => sharp({ text: { ...textOptions, ...(width ? { width } : {}),
    text: `<span foreground="${escape(cover.ink)}" weight="600">${escape(text)}</span>`,
  } });
  // A title wider than one line is split into the two lines with the narrowest widest line.
  let titleText = title;
  if ((await textImage(titleText).metadata()).width > 1040) {
    const words = titleText.trim().split(/\s+/);
    let narrowest = Infinity;
    for (let index = 1; index < words.length; index++) {
      const lines = [words.slice(0, index).join(' '), words.slice(index).join(' ')];
      const widths = await Promise.all(lines.map(async line => (await textImage(line).metadata()).width));
      if (Math.max(...widths) < narrowest) {
        narrowest = Math.max(...widths);
        titleText = lines.join('\n');
      }
    }
  }
  // No wrap width here: the lines are already chosen, and wrapping again would break words mid-way
  // ("환영합/니다"). A line too wide for the image is scaled down instead.
  const image = await textImage(titleText)
    .resize({ width: 1040, height: 430, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  return sharp(background).composite([{ input: image, gravity: 'centre' }]).png().toBuffer();
}
