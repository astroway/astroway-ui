import { AwElement, escapeHtml, type ApiRequest, define } from './base.ts';
import { CHART_ATTRIBUTES, chartRequest } from './chart-request.ts';

interface Synastry {
  score: number; label: string;
  spheres: { key: string; score: number | null; label: string | null; count: number }[];
  localized?: { label?: string; labels?: Record<string, string>; spheres?: Record<string, string> };
}

/**
 * <aw-synastry-score a-date=... a-latitude=... a-longitude=... b-date=... b-latitude=... b-longitude=...>
 * Layer B: POST /v1/public/synastry. It costs 3 units of the visitor's public budget, the heaviest keyless call.
 */
export class AwSynastryScore extends AwElement<Synastry> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHART_ATTRIBUTES.flatMap((a) => [`a-${a}`, `b-${a}`])];
  }

  protected request(): ApiRequest | null {
    const chart1 = chartRequest(this, 'a-');
    const chart2 = chartRequest(this, 'b-');
    return chart1 && chart2 ? { layer: 'B', path: '/public/synastry', body: { chart1, chart2 } } : null;
  }

  protected draw(d: Synastry): string {
    const L = d.localized ?? {};
    const spheres = d.spheres.map((s) => {
      const value = s.score ?? 0;
      return `<li part="sphere"><span class="k">${escapeHtml(L.spheres?.[s.key] ?? s.key)}</span>`
        + `<span class="bar"><span style="width:${s.score === null ? 0 : value}%"></span></span>`
        + `<span class="v">${s.score === null ? '–' : value}</span></li>`;
    }).join('');
    return `<style>:host{display:block}.score{font-size:2.6em;font-weight:700;text-align:center;line-height:1;color:var(--aw-accent,#0b5fbf)}.label{text-align:center;margin:.2em 0 .8em;opacity:.8}ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:auto 1fr 2.2em;gap:.35em .5em;font-size:.9em}li{display:grid;grid-column:1/-1;grid-template-columns:subgrid;align-items:center}.bar{height:.5em;border-radius:999px;background:var(--aw-bg-soft,rgba(127,127,127,.15));overflow:hidden}.bar span{display:block;height:100%;background:var(--aw-accent,#0b5fbf)}.v{text-align:right;font-variant-numeric:tabular-nums}</style>`
      + `<div part="score" class="score">${d.score}</div>`
      + `<div part="label" class="label">${escapeHtml(L.label ?? d.label)}</div><ul>${spheres}</ul>`;
  }
}

define('aw-synastry-score', AwSynastryScore);
