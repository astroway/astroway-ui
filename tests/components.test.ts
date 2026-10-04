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
    vi.stubGlobal('fetch', respond(429, { ok: false, error: { message: 'Try again in 600s' } }));
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

  it('checkBrowserKey accepts only pk_', () => {
    expect(() => checkBrowserKey('aw_test_x')).toThrow(/secret/);
    expect(() => checkBrowserKey('sk_x')).toThrow(/pk_/);
    expect(checkBrowserKey('pk_test_x')).toBe('pk_test_x');
  });
});
