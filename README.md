# @astroway/ui

Astrology web components for any page: plain custom elements that work in HTML, WordPress, Vue, Svelte and React 19 without a wrapper. Charts are drawn by [`@astroway/render`](https://www.npmjs.com/package/@astroway/render), the same code behind the [AstroWay API](https://api.astroway.info/docs/) `/v1/render/*` endpoints, so a wheel on your page matches the wheel the API returns.

## Install

```bash
npm install @astroway/ui
```

```js
import '@astroway/ui';                 // every element
import '@astroway/ui/natal-wheel';     // or just one
```

Or from a CDN, no build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@astroway/ui/dist/cdn/index.js"></script>
```

## Three ways to feed an element

**A. Your data.** Fetch on your server, hand the element the JSON. No request leaves the page, and any key class works because the browser never sees one.

```js
document.querySelector('aw-natal-wheel').data = chartFromYourServer; // a /v1/chart response
```

A server template can write the same JSON into the attribute instead: `<aw-natal-wheel data='<?= json_encode($chart) ?>'>`.

**B. Keyless.** Elements backed by `/v1/public/*` need no key. They share the visitor's public budget of 30 units an hour; `aw-synastry-score` costs 3.

```html
<aw-moon-phase lang="uk"></aw-moon-phase>
<aw-horoscope sign="leo" period="daily" lang="de"></aw-horoscope>
<aw-tarot-spread spread="three-card"></aw-tarot-spread>
```

**C. Publishable key.** Elements backed by keyed endpoints take a `pk_` key created for your site in the dashboard, with its origin list, credit cap and endpoint scope. A secret `aw_` key is refused before any request is made. `key` works too, outside React.

```html
<aw-natal-wheel api-key="pk_live_..." date="1990-05-15" time="14:30"
  latitude="50.45" longitude="30.52" timezone-offset="3"></aw-natal-wheel>
```

## React and Next.js

React 19 renders custom elements directly. Two things differ from plain HTML: React keeps `key` for itself, so pass the key as `api-key`; and on a server-rendered page pass layer A data as a string, because React drops object props on the server and does not set them while hydrating.

```tsx
'use client';
import '@astroway/ui/natal-wheel';
import '@astroway/ui/jsx'; // types the <aw-*> tags for TypeScript

export default function Chart({ chart }: { chart: unknown }) {
  return <aw-natal-wheel data={JSON.stringify(chart)} />;
}
```

The modules can be imported on the server: the tag goes out as plain HTML and draws once the browser loads the element.

## Elements

| Element | Layers | Source |
|---|---|---|
| `aw-natal-wheel` | A, C | `/v1/chart` |
| `aw-aspect-grid` | A, C | `/v1/chart` |
| `aw-planet-table` | A, C | `/v1/chart` |
| `aw-moon-phase` | A, B | `/v1/public/moon-phase` |
| `aw-planet-of-day` | A, B | `/v1/public/planet-of-day` |
| `aw-horoscope` | A, B | `/v1/public/horoscope/{daily,weekly,monthly}` |
| `aw-tarot-card`, `aw-tarot-spread` | A, B | `/v1/public/tarot/*` |
| `aw-sign-matrix` | A, B | `/v1/public/compatibility/matrix` |
| `aw-synastry-score` | A, B | `/v1/public/synastry` |
| `aw-chinese-sign` | A, C | `/v1/chinese/zodiac/animal` + `/v1/public/chinese/zodiac/texts` |

`aw-aspect-grid` is about 560 px wide at its own size; in a narrower column it scales down and the orb labels get small. Add `scroll` to keep it at full size with horizontal scrolling instead.

Common attributes: `lang` (21 languages, falls back to the page's `<html lang>`), `theme` (`light`, `dark`), `size`. Theme with CSS custom properties: `--aw-accent`, `--aw-fg`, `--aw-bg`, `--aw-bg-soft`, `--aw-border`. Each element emits `aw-error` with `{ kind, message }`, where `kind` is `error`, `rate-limited` or `key`.

## License

MIT
