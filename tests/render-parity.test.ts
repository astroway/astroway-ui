import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderWesternWheel } from '@astroway/render/wheel-western';
import { renderAspectGrid } from '@astroway/render/aspect-grid';
import '../src/index.ts';

/* The API's render gate pins @astroway/render to /v1/render byte for byte. This pins the
   other half: an element hands the pinned renderer's SVG to the page unchanged. */
const chart = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/chart.json`, 'utf8'));
const settle = () => new Promise((r) => setTimeout(r, 0));

function normalized(markup: string): string {
  const box = document.createElement('div');
  box.innerHTML = markup;
  return box.querySelector('svg')!.outerHTML;
}

async function drawn(tag: string, attrs = ''): Promise<string> {
  document.body.innerHTML = `<${tag} ${attrs}></${tag}>`;
  const el = document.body.firstElementChild as HTMLElement & { data: unknown };
  el.data = chart;
  await settle(); await settle();
  return el.shadowRoot!.querySelector('svg')!.outerHTML;
}

describe('elements draw exactly what @astroway/render draws', () => {
  it('aw-natal-wheel', async () => {
    expect(await drawn('aw-natal-wheel')).toBe(normalized(renderWesternWheel(chart, { size: 500, theme: 'light', showAspects: true })));
    const dark = await drawn('aw-natal-wheel', 'theme="dark" size="420"');
    expect(dark).toBe(normalized(renderWesternWheel(chart, { size: 420, theme: 'dark', showAspects: true })));
    // Otherwise the comparison could pass on output that ignores its options.
    expect(dark).not.toBe(await drawn('aw-natal-wheel'));
  });

  it('aw-aspect-grid', async () => {
    expect(await drawn('aw-aspect-grid')).toBe(normalized(renderAspectGrid({ planets: chart.planets, aspects: chart.aspects }, { theme: 'light' })));
  });
});
