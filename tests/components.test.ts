import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../src/index.ts';
import { checkBrowserKey } from '../src/base.ts';

const chart = {
  planets: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].map((name, i) => ({ id: i, name, longitude: i * 50 + 10 })),
  houses: { cusps: Array.from({ length: 12 }, (_, i) => i * 30), ascendant: 0, mc: 270 },
  aspects: [],
};

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

const settle = () => new Promise((r) => setTimeout(r, 0));

function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } }));
}

beforeEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('layer A: data in, SVG out, no network', () => {
  it('aw-natal-wheel draws a chart it is given', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const el = mount('<aw-natal-wheel size="300"></aw-natal-wheel>') as HTMLElement & { data: unknown };
    el.data = chart;
    await settle();
    expect(el.shadowRoot!.innerHTML).toContain('<svg');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('aw-moon-phase draws the fraction it is given and escapes the caption, with no request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const el = mount('<aw-moon-phase></aw-moon-phase>') as HTMLElement & { data: unknown };
    el.data = { illuminationFraction: 0.4, waxing: true, phaseName: '<img src=x onerror=alert(1)>' };
    await settle();
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('<svg');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(fetchSpy, 'data set right after insertion must win over the keyless fetch').not.toHaveBeenCalled();
  });
});

describe('layer B: keyless public route', () => {
  it('aw-moon-phase calls /public/moon-phase with lang, sends no key, shows the footer', async () => {
    const fetchSpy = respond(200, {
      ok: true,
      data: { date: '2026-10-04', illuminationPercent: 39.3, waxing: false, phaseName: 'Waning Crescent', localized: { phaseName: 'Спадний серп' } },
      _footer: 'Powered by AstroWay',
    });
    vi.stubGlobal('fetch', fetchSpy);
    const el = mount('<aw-moon-phase date="2026-10-04" lang="uk"></aw-moon-phase>');
    await settle(); await settle();
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.astroway.info/v1/public/moon-phase?date=2026-10-04&lang=uk');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBeUndefined();
    expect(el.shadowRoot!.textContent).toContain('Спадний серп');
    expect(el.shadowRoot!.textContent).toContain('Powered by AstroWay');
  });

  it('shows a rate-limited state with the wait, not a generic error', async () => {
    // The production body, word for word: the header is the primary source, this the fallback.
    vi.stubGlobal('fetch', respond(429, { ok: false, error: { code: 'PUBLIC_RATE_LIMIT', message: 'Public endpoint rate limit exceeded (30/hour per IP). Retry in 600s or get a free API key at https://api.astroway.info.' } }));
    const el = mount('<aw-moon-phase date="2026-10-04"></aw-moon-phase>');
    await settle(); await settle();
    const state = el.shadowRoot!.querySelector('[part="rate-limited"]');
    expect(state?.textContent).toContain('10 min');
  });

  it('answers the same input from the session cache on the next mount', async () => {
    const fetchSpy = respond(200, { ok: true, data: { date: '2026-10-04', illuminationPercent: 50, waxing: true, phaseName: 'First Quarter' } });
    vi.stubGlobal('fetch', fetchSpy);
    mount('<aw-moon-phase date="2026-10-04"></aw-moon-phase>');
    await settle(); await settle();
    mount('<aw-moon-phase date="2026-10-04"></aw-moon-phase>');
    await settle(); await settle();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('layer A as an attribute', () => {
  // A server render (React SSR, PHP, WordPress) can only write strings into HTML.
  it('reads a JSON string in the data attribute, with no request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const el = mount(`<aw-planet-table data='${JSON.stringify(chart)}'></aw-planet-table>`);
    await settle(); await settle();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(el.shadowRoot!.textContent).toContain('Mercury');
  });

  it('says so when the data attribute is not JSON', async () => {
    const el = mount('<aw-planet-table data="{oops"></aw-planet-table>');
    await settle(); await settle();
    expect(el.shadowRoot!.querySelector('[part="error"]')?.textContent).toContain('data attribute');
  });
});

describe('layer C: publishable key only', () => {
  it('refuses a secret aw_ key before any request leaves', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const el = mount('<aw-natal-wheel key="aw_live_secret" date="1990-05-15" latitude="50.45" longitude="30.52"></aw-natal-wheel>');
    await settle(); await settle();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(el.shadowRoot!.querySelector('[part="key"]')?.textContent).toContain('secret aw_ key');
  });

  it('posts to /chart with the pk_ key and draws the answer', async () => {
    const fetchSpy = respond(200, { ok: true, data: chart });
    vi.stubGlobal('fetch', fetchSpy);
    const el = mount('<aw-natal-wheel key="pk_live_abc" date="1990-05-15" time="14:30" latitude="50.45" longitude="30.52" timezone-offset="3"></aw-natal-wheel>');
    await settle(); await settle();
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.astroway.info/v1/chart?lang=en');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('pk_live_abc');
    expect(JSON.parse(String(init.body))).toEqual({ date: '1990-05-15', time: '14:30:00', timezoneOffset: 3, latitude: 50.45, longitude: 30.52 });
    expect(el.shadowRoot!.innerHTML).toContain('<svg');
  });

  it('reads the wait from Retry-After when CORS exposes it', async () => {
    vi.stubGlobal('fetch', respond(429, { ok: false, error: { message: 'rate limited' } }, { 'Retry-After': '1800' }));
    const el = mount('<aw-moon-phase date="2026-10-04"></aw-moon-phase>');
    await settle(); await settle();
    expect(el.shadowRoot!.querySelector('[part="rate-limited"]')?.textContent).toContain('30 min');
  });

  it('names the likely cause when the browser blocks a keyed request', async () => {
    // A pk_ key that does not list the page's origin gets a 403 without CORS headers,
    // which fetch reports as a bare TypeError.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const el = mount('<aw-natal-wheel key="pk_live_abc" date="1990-05-15" latitude="50.45" longitude="30.52"></aw-natal-wheel>');
    await settle(); await settle();
    const state = el.shadowRoot!.querySelector('[part="key"]');
    expect(state?.textContent).toContain("allowed origins");
  });

  it('aw-planet-table takes names from localized when the API sends it', async () => {
    const el = mount('<aw-planet-table></aw-planet-table>');
    (el as unknown as { data: unknown }).data = {
      planets: [{ name: 'Sun', longitude: 54.4 }, { name: 'true Node', longitude: 300 }],
      localized: { planets: { Sun: 'Сонце', 'true Node': 'Північний вузол' }, signs: { taurus: 'Телець', aquarius: 'Водолій' } },
    };
    await settle(); await settle();
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Сонце');
    expect(text).toContain('Телець');
    expect(text).toContain('Північний вузол');
    expect(text).toContain('Водолій');
    expect(text).not.toContain('Taurus');
  });

  it('aw-aspect-grid scales to fit by default and keeps its size with scroll', async () => {
    const el = mount('<aw-aspect-grid></aw-aspect-grid>');
    (el as unknown as { data: unknown }).data = chart;
    await settle(); await settle();
    expect(el.shadowRoot!.innerHTML).not.toContain('overflow-x:auto');
    el.setAttribute('scroll', '');
    await settle(); await settle();
    expect(el.shadowRoot!.innerHTML).toContain('overflow-x:auto');
  });

  it('three elements on the same chart share one request', async () => {
    const fetchSpy = respond(200, { ok: true, data: chart });
    vi.stubGlobal('fetch', fetchSpy);
    const attrs = 'key="pk_live_abc" date="1990-05-15" time="14:30" latitude="50.45" longitude="30.52" timezone-offset="3"';
    document.body.innerHTML = `<aw-natal-wheel ${attrs}></aw-natal-wheel><aw-planet-table ${attrs}></aw-planet-table><aw-aspect-grid ${attrs}></aw-aspect-grid>`;
    await settle(); await settle(); await settle();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    for (const el of document.body.children) expect(el.shadowRoot!.querySelector('[role="alert"]')).toBeNull();
  });

  it('takes the key from api-key, since React keeps `key` for itself', async () => {
    const fetchSpy = respond(200, { ok: true, data: chart });
    vi.stubGlobal('fetch', fetchSpy);
    mount('<aw-natal-wheel api-key="pk_live_xyz" date="1990-05-15" time="14:30" latitude="50.45" longitude="30.52" timezone-offset="3"></aw-natal-wheel>');
    await settle(); await settle();
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('pk_live_xyz');
  });

  it('checkBrowserKey accepts only pk_', () => {
    expect(() => checkBrowserKey('aw_test_x')).toThrow(/secret/);
    expect(() => checkBrowserKey('sk_x')).toThrow(/pk_/);
    expect(checkBrowserKey('pk_test_x')).toBe('pk_test_x');
  });
});
