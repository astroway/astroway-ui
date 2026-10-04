# Changelog

## 0.1.0-alpha.1

- The rate-limited state shows how long to wait: read from `Retry-After`, or from the API's own message when a proxy drops the header.
- A keyed request the browser blocks (usually an origin missing from the key's list) now says so instead of `Failed to fetch`.
- `aw-synastry-score`: every bar starts at the same edge; a longer sphere name used to push its own bar right.
- `aw-planet-table` shows planet and sign names in the element's language, from the `localized` table `/v1/chart` returns with `?lang=`.
- `aw-aspect-grid scroll` keeps the grid at full size and scrolls sideways, for pages where the orb labels must stay readable on a phone.
- Importing on the server no longer throws (`HTMLElement is not defined` in Next.js, Nuxt, Astro); the tag renders as HTML and upgrades in the browser.
- `api-key` attribute: React keeps `key` for itself, so `<aw-natal-wheel key=...>` never reached the element in React.
- Layer A data can be a JSON string in the `data` attribute, for server-rendered React and server templates.
- `@astroway/ui/jsx`: opt-in JSX types for the `<aw-*>` tags in React + TypeScript.
- Elements that ask for the same chart at the same time share one request, so a wheel, a table and a grid on one page cost one call instead of three.

## 0.1.0-alpha.0

First alpha: ten elements over three layers (your data, keyless, publishable key), drawn with `@astroway/render`.
