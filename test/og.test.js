import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createCover } from '../src/index.js';
import { createOgImage } from '../src/og.js';

test('renders a 1200×630 PNG for short and long titles', async () => {
  for (const title of ['짧은 제목', 'A considerably longer title that has to wrap onto two separate lines <&>']) {
    const png = await createOgImage({ title, cover: await createCover(title) });
    const meta = await sharp(png).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
  }
  // A title color with markup characters is escaped, so it can't add attributes; it is just an invalid color.
  await assert.rejects(createOgImage({ title: 'Ink', cover: { ...(await createCover('Ink')), ink: '#000" size="1' } }));
  for (const fontSize of [48, 160]) assert.equal((await sharp(await createOgImage({ title: 'Size', cover: await createCover('Size'), fontSize })).metadata()).width, 1200);
});
