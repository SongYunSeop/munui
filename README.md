# seedcover

Deterministic pixel-mosaic cover images from text. The same text always gives the same cover, so posts without a photo still get a stable, distinct thumbnail.

- No dependencies for the cover itself; runs in Node 20+, browsers, Workers.
- Opaque squares in theme colors fill the whole grid, so a cover looks the same on any page.
- Comes with a title color (`cover.ink`): black or white, whichever suits the cover, or your own.
- Optional Open Graph PNG (1200×630) with [sharp](https://sharp.pixelplumbing.com/).

## Install

```sh
npm install seedcover
npm install sharp   # only for seedcover/og
```

## Usage

```js
import { createCover, coverToSvg } from 'seedcover';

const cover = await createCover(`${title}\n${excerpt}\n${body}`);
// { ink: '#000000', blocks: [{ x, y, width, height, color }, ...] }  squares filling a 240×160 grid

const svg = coverToSvg(cover);                       // 240×160, scales freely (3:2)
```

Put the title on top with your own HTML/CSS using `cover.ink` as the text color. The pixels aren't faded under it, so a busy pattern can make a title harder to read; a text shadow or a translucent band behind the title helps.

### Open Graph image

```js
import { createOgImage } from 'seedcover/og';

const png = await createOgImage({
  title,
  cover,
  fontfile: './fonts/NotoSansKR.ttf', // optional; without it a system font is used
  font: 'Noto Sans KR',               // family name inside fontfile
  fontSize: 96,                       // optional; title px on 1200×630, shrunk if it doesn't fit
});
```

The 3:2 cover is cropped to 1200×630 around its center; long titles are split into two balanced lines. CI images often have no CJK fonts, so pass `fontfile` for Korean/Japanese/Chinese titles.

## API

| Export | Description |
| --- | --- |
| `createCover(text, options = defaultStyle)` | Async. SHA-256 of the NFC-normalized text (plus `options.salt`) → cover. |
| `createCoverPattern(hash, options)` | Sync. Same, from your own hash bytes (`Uint8Array`, 32 bytes such as SHA-256). |
| `hashText(text, salt)` | The hash `createCover` uses. |
| `coverToSvg(cover, { width, height, viewBox })` | SVG string. |
| `defaultStyle` | Full-bleed mosaic with 8 colors picked per text from 24 muted candidates. |
| `themes` | Named color themes; spread one over a style. |
| `mutedColorCandidates` | The 24 colors `defaultStyle` picks from. |
| `createOgImage({ title, cover, fontfile, font, fontSize })` | `seedcover/og`. PNG `Buffer`. |

### Themes

```js
import { createCover, defaultStyle, themes } from 'seedcover';

await createCover(text, { ...defaultStyle, ...themes.warm });
await createCover(text, { ...defaultStyle, ...themes.night, colorCount: 5 }); // 5 of its 8 colors per text
```

| Key | Mood |
| --- | --- |
| `muted` | Muted: calm coral and teal (= `defaultStyle`, 8 of 24 per text) |
| `warm` | Warm: terracotta, ochre, sand |
| `fresh` | Fresh: mint, sky, lemon, leaf |
| `dawn` | Dawn: lavender, peach, pale blue |
| `dusk` | Dusk: coral, plum, amber, dusk blue |
| `night` | Night: navy, indigo, moonlight gold (white title) |
| `cozy` | Cozy: cream, knit beige, cocoa |
| `playful` | Playful: soft candy colors |

### Options

`defaultStyle` is `{ colorMode: 'auto', maxSize: 6, pixels, colorCandidates, accentShare: .45, seed: 0 }`. Spread it and override, e.g. `{ ...defaultStyle, maxSize: 10 }`. Passing `{}` gives the base settings: default colors, mixed colors and `accentShare: .15`.

| Option | Effect |
| --- | --- |
| `salt` | Any string, e.g. your domain. Mixed into the hash, so your covers differ from everyone else's for the same text. `createCover` only. |
| `seed` | Another variation for the same text (integer). |
| `maxSize` | Largest pixel, in 4-unit cells. The grid is always filled edge to edge. |
| `pixels` | Colors. Usually set through a theme. |
| `ink` | Title color. Defaults to black or white, whichever contrasts more with the cover's average color. |
| `colorCandidates` | Pick colors per text from this list. |
| `colorCount` | How many to pick from `colorCandidates` (default: `pixels.length`). |
| `colorMode` | `'auto'` (defaultStyle; picks a look per text), mix (leave it out), `'groups'` (color patches), or a shape: `'bands'` (vertical stripes), `'rows'` (horizontal), `'diagonal'`, `'waves'`, `'rings'` (around a point set by the text). Shapes ignore `accentShare`. |
| `accentShare` | Share of accent colors (0–1). |

Output for a given text and options is frozen by tests; changing it is a breaking change.

## License

MIT
