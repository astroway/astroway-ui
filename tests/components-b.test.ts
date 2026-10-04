import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../src/index.ts';
import { renderProse } from '../src/horoscope.ts';

const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0)); };
function mount(html: string) { document.body.innerHTML = html; return document.body.firstElementChild as HTMLElement; }
function routes(map: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const path = new URL(url).pathname.replace('/v1', '');
    const data = map[path];
    return new Response(JSON.stringify(data === undefined ? { ok: false, error: { message: `no fixture for ${path}` } } : { ok: true, data }), { status: data === undefined ? 404 : 200 });
  });
}

beforeEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

describe('layer B elements call their public route with no key and use localized names', () => {
  it('aw-planet-of-day', async () => {
    const f = routes({ '/public/planet-of-day': { date: '2026-10-04', weekday: 'Sunday', planet: 'Sun', glyph: '☉', themes: ['vitality'], localized: { planet: 'Сонце', weekday: 'Неділя' } } });
    vi.stubGlobal('fetch', f);
    const el = mount('<aw-planet-of-day date="2026-10-04" lang="uk"></aw-planet-of-day>');
    await settle();
    expect(el.shadowRoot!.textContent).toContain('Сонце');
    expect(el.shadowRoot!.textContent).not.toContain('vitality');
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).not.toHaveProperty('X-Api-Key');
  });

  it('aw-sign-matrix shows one pair with localized relation and tone', async () => {
    vi.stubGlobal('fetch', routes({ '/public/compatibility/matrix': {
      pairs: [{ signA: 'aries', signB: 'leo', relation: 'trine', tone: 'harmonious' }],
      localized: { signs: { aries: 'Овен', leo: 'Лев' }, relations: { trine: 'Трин' }, tones: { harmonious: 'Гармонійна' } },
    } }));
    const el = mount('<aw-sign-matrix sign-a="leo" sign-b="aries" lang="uk"></aw-sign-matrix>');
    await settle();
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Лев');
    expect(text).toContain('Трин');
    expect(text).toContain('Гармонійна');
  });

  it('aw-synastry-score posts both charts and draws spheres with localized names', async () => {
    const f = routes({ '/public/synastry': {
      score: 59, label: 'balanced', spheres: [{ key: 'love', score: 68, label: 'harmonious', count: 4 }, { key: 'passion', score: null, label: null, count: 0 }],
      localized: { label: 'Збалансована', spheres: { love: 'Кохання', passion: 'Пристрасть' } },
    } });
    vi.stubGlobal('fetch', f);
    const el = mount('<aw-synastry-score lang="uk" a-date="1990-05-15" a-latitude="50.45" a-longitude="30.52" b-date="1988-11-02" b-latitude="48.85" b-longitude="2.35"></aw-synastry-score>');
    await settle();
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.chart1.latitude).toBe(50.45);
    expect(body.chart2.longitude).toBe(2.35);
    expect(el.shadowRoot!.textContent).toContain('Кохання');
    expect(el.shadowRoot!.textContent).toContain('Збалансована');
  });

  it('aw-tarot-card takes the localized card name and the reversed side', async () => {
    vi.stubGlobal('fetch', routes({ '/public/tarot/daily': {
      date: '2026-10-04',
      drawn: [{ position: { index: 0, name: 'The Card', meaning: '' }, reversed: true,
        card: { slug: '8-of-swords', name: '8 of Swords', upright: { keywords: ['trapped'], meaning: 'Up' }, reversed: { keywords: ['release'], meaning: 'Down' } } }],
      localized: { cards: { '8-of-swords': { name: 'Вісімка Мечів', reversed: { keywords: ['звільнення'], meaning: 'Вниз' } } }, positions: [{ index: 0, name: 'Карта' }] },
    } }));
    const el = mount('<aw-tarot-card date="2026-10-04" lang="uk"></aw-tarot-card>');
    await settle();
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('Вісімка Мечів');
    expect(text).toContain('звільнення');
    expect(text).not.toContain('trapped');
  });

  it('aw-tarot-spread asks for the spread it names', async () => {
    const f = routes({ '/public/tarot/celtic-cross': { date: '2026-10-04', drawn: [] } });
    vi.stubGlobal('fetch', f);
    mount('<aw-tarot-spread spread="celtic-cross" date="2026-10-04"></aw-tarot-spread>');
    await settle();
    expect(String(f.mock.calls[0][0])).toContain('/public/tarot/celtic-cross?date=2026-10-04');
  });
});

describe('aw-chinese-sign', () => {
  it('takes the animal with the pk_ key, then the keyless texts', async () => {
    const f = routes({
      '/chinese/zodiac/animal': { animal: 'Horse', animalName: 'Кінь', glyph: '🐎', element: { fixed: 'Fire', fixedName: 'Вогонь', yin: false } },
      '/public/chinese/zodiac/texts': { animals: { horse: { name: 'Кінь', character: 'Волелюбний', strengths: 'Енергійний', caution: 'Нетерплячий' } } },
    });
    vi.stubGlobal('fetch', f);
    const el = mount('<aw-chinese-sign key="pk_live_x" date="1990-05-15" latitude="50.45" longitude="30.52" lang="uk"></aw-chinese-sign>');
    await settle();
    const [first, second] = f.mock.calls as unknown as [string, RequestInit][];
    expect((first[1].headers as Record<string, string>)['X-Api-Key']).toBe('pk_live_x');
    expect((second[1].headers as Record<string, string>)['X-Api-Key']).toBeUndefined();
    expect(el.shadowRoot!.textContent).toContain('Волелюбний');
  });
});

describe('horoscope prose', () => {
  it('renders paragraphs, bold and bullets, and escapes everything else', () => {
    const html = renderProse('One **bold** line\n\n- a\n- b <script>x</script>');
    expect(html).toBe('<p>One <strong>bold</strong> line</p><ul><li>a</li><li>b &lt;script&gt;x&lt;/script&gt;</li></ul>');
  });
});

describe('horoscope prose, as the API actually sends it', () => {
  it('turns a lead line followed by bullets into a paragraph and a list', () => {
    expect(renderProse('**Tips**\n- one\n- two\n\nEnd.')).toBe('<p><strong>Tips</strong></p><ul><li>one</li><li>two</li></ul><p>End.</p>');
  });
});
