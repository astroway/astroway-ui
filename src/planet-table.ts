import { SIGN_NAMES, PLANET_GLYPH, SIGN_GLYPH, astroBodyName } from '@astroway/render';
import { AwElement, escapeHtml, type ApiRequest, define } from './base.ts';
import { CHART_ATTRIBUTES, chartRequest } from './chart-request.ts';

interface ChartLike {
  planets: { name: string; longitude: number; isRetrograde?: boolean }[];
  localized?: { planets?: Record<string, string>; signs?: Record<string, string> };
}

function degree(longitude: number): string {
  const inSign = ((longitude % 30) + 30) % 30;
  const d = Math.floor(inSign);
  const m = Math.floor((inSign - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/** <aw-planet-table>: body, sign and degree per planet. Layers A and C. Names come from the response's `localized` table when present. */
export class AwPlanetTable extends AwElement<ChartLike> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHART_ATTRIBUTES];
  }

  protected request(): ApiRequest | null {
    const body = chartRequest(this);
    return body ? { layer: 'C', path: '/chart', body } : null;
  }

  protected draw(chart: ChartLike): string {
    const rows = chart.planets.map((p) => {
      const name = astroBodyName(p.name);
      const sign = Math.floor((((p.longitude % 360) + 360) % 360) / 30);
      const label = chart.localized?.planets?.[p.name] ?? name;
      const signLabel = chart.localized?.signs?.[SIGN_NAMES[sign].toLowerCase()] ?? SIGN_NAMES[sign];
      /* A no-break space keeps each glyph on its name's line at 320 px; the name itself may still wrap. */
      return `<tr><td><span class="glyph" aria-hidden="true">${PLANET_GLYPH[name] ?? ''}</span>&nbsp;${escapeHtml(label)}</td>`
        + `<td><span class="glyph" aria-hidden="true">${SIGN_GLYPH[sign]}</span>&nbsp;${escapeHtml(signLabel)}</td>`
        + `<td class="num">${degree(p.longitude)}${p.isRetrograde ? '&nbsp;<span title="retrograde">℞</span>' : ''}</td></tr>`;
    }).join('');
    return `<style>table{border-collapse:collapse;width:100%;font-size:.9em}td{padding:.3em .3em;overflow-wrap:normal;word-break:normal;border-bottom:1px solid var(--aw-border,rgba(127,127,127,.2))}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.glyph{display:inline}td:nth-child(2){white-space:nowrap}</style>`
      + `<table part="table"><tbody>${rows}</tbody></table>`;
  }
}

define('aw-planet-table', AwPlanetTable);
