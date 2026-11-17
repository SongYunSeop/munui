import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCover, createCoverPattern, coverToSvg, defaultStyle, hashText, themes } from '../src/index.js';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('output is frozen', async () => {
  // Same layout and colors as songyunseop.com's generator, without its fading. A change here changes every existing cover.
  assert.equal(digest(await createCover('중력\n우리에게 끌림은 어떤 의미일까?')), '45126254a9e086e9f6def5bad6f513c0dc5d38f2e1e8749d7269dd244f6467ed');
  assert.equal(digest(await createCover('Hello, world')), '99950ed94512a2fe73bf4bb856a2a36d380b8a670d1280debabd1b2b0c0787ba');
});

test('same text gives the same cover, Hangul normalization included; edits change it', async () => {
  const text = '중력\n우리에게 끌림은 어떤 의미일까?';
  assert.deepEqual(await createCover(text), await createCover(text));
  assert.deepEqual(await createCover(text), await createCover(text.normalize('NFD')));
  assert.notDeepEqual(await createCover(text), await createCover(text + '\n새로 쓴 문단'));
  assert.deepEqual(await hashText(text), new Uint8Array(createHash('sha256').update(text.normalize('NFC')).digest()));
});

test('salt gives every site its own covers; no salt keeps the original output', async () => {
  const text = '중력\n우리에게 끌림은 어떤 의미일까?';
  assert.deepEqual(await createCover(text, { ...defaultStyle, salt: '' }), await createCover(text));
  const mine = await createCover(text, { ...defaultStyle, salt: 'songyunseop.com' });
  assert.notDeepEqual(mine, await createCover(text));
  assert.notDeepEqual(mine, await createCover(text, { ...defaultStyle, salt: 'example.com' }));
  assert.deepEqual(mine, await createCover(text, { ...defaultStyle, salt: 'songyunseop.com' }));
  assert.deepEqual(await hashText('b', 'a'), new Uint8Array(createHash('sha256').update('a\0b').digest()));
  assert.notDeepEqual(await hashText('c', 'ab'), await hashText('bc', 'a'));
});

test('colorCount picks that many candidates; ink is given or black/white for the cover', async () => {
  const candidates = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
  const cover = await createCover('palette', { ...defaultStyle, colorCandidates: candidates, colorCount: 3 });
  const colors = new Set(cover.blocks.map(block => block.color));
  assert.ok(colors.size <= 3 && [...colors].every(color => candidates.includes(color)));
  assert.equal((await createCover('palette', { ...defaultStyle, ink: '#e05050' })).ink, '#e05050');
  assert.equal((await createCover('palette', { ...defaultStyle, pixels: ['#111111', '#222233'], colorCandidates: undefined })).ink, '#ffffff');
  assert.equal((await createCover('palette', { ...defaultStyle, pixels: ['#eeeeee', '#ffffdd'], colorCandidates: undefined })).ink, '#000000');
  // A one-color palette works in every color mode.
  for (const colorMode of [undefined, 'auto', 'groups', 'bands']) {
    const single = await createCover('palette', { ...defaultStyle, colorMode, pixels: ['#336699'], colorCandidates: undefined });
    assert.ok(single.blocks.every(block => block.color === '#336699'), String(colorMode));
  }
  // colorCount equal to the pixels length is the same as leaving it out.
  assert.deepEqual(await createCover('palette', { ...defaultStyle, colorCount: 8 }), await createCover('palette'));
});

test('themes: muted equals defaultStyle; every theme uses only its colors', async () => {
  assert.deepEqual(await createCover('theme', { ...defaultStyle, ...themes.muted }), await createCover('theme'));
  for (const [id, theme] of Object.entries(themes)) {
    assert.ok(theme.name && theme.pixels.length >= 2, id);
    for (let index = 0; index < 10; index++) {
      const cover = await createCover(`${id} ${index}`, { ...defaultStyle, ...theme });
      assert.ok(cover.blocks.every(block => theme.colorCandidates.includes(block.color)), id);
    }
  }
});

test('fills the grid without gaps or overlaps, with varied color combinations', async () => {
  const combinations = new Set();
  for (let index = 0; index < 100; index++) {
    const cover = await createCover(`글 ${index}: 하루의 생각과 기록`);
    const colors = new Set(cover.blocks.map(block => block.color));
    assert.ok(colors.size <= 8 && [...colors].every(color => defaultStyle.colorCandidates.includes(color)));
    combinations.add([...colors].sort().join(','));
    const occupied = new Set();
    for (const block of cover.blocks) {
      assert.ok(block.x + block.width <= 240 && block.y + block.height <= 160 && block.width === block.height);
      for (let y = block.y; y < block.y + block.height; y += 4) for (let x = block.x; x < block.x + block.width; x += 4) {
        assert.ok(!occupied.has(`${x},${y}`));
        occupied.add(`${x},${y}`);
      }
    }
    assert.equal(occupied.size, 2400);
  }
  assert.ok(combinations.size > 50);
});

test('shape color modes: deterministic, theme colors only, each its own look', async () => {
  const looks = new Set();
  for (const colorMode of ['bands', 'rows', 'diagonal', 'waves', 'rings']) {
    const cover = await createCover('modes', { ...defaultStyle, ...themes.dusk, colorMode });
    assert.deepEqual(cover, await createCover('modes', { ...defaultStyle, ...themes.dusk, colorMode }));
    assert.ok(cover.blocks.every(block => themes.dusk.pixels.includes(block.color)), colorMode);
    looks.add(digest(cover.blocks.map(block => block.color)));
  }
  assert.equal(looks.size, 5);
});

test('no options: default colors, still deterministic', () => {
  const hash = createHash('sha256').update('x').digest();
  const cover = createCoverPattern(hash, {});
  assert.ok(cover.blocks.length > 0 && cover.blocks.every(block => defaultStyle.pixels.includes(block.color)));
  assert.deepEqual(cover, createCoverPattern(hash, {}));
});

test('coverToSvg renders every block and escapes attribute values', async () => {
  const cover = await createCover('svg');
  const svg = coverToSvg(cover);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="240" height="160" viewBox="0 0 240 160"/);
  assert.equal(svg.match(/<rect /g).length, cover.blocks.length);
  const injected = { ...cover.blocks[0], color: '"><script>', x: '0"/><script>alert(1)</script><rect x="0' };
  assert.ok(!coverToSvg({ ...cover, blocks: [injected] }).includes('<script>'));
  assert.ok(!coverToSvg(cover, { width: '1"><script>' }).includes('<script>'));
});
