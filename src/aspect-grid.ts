import { renderAspectGrid } from '@astroway/render/aspect-grid';
import type { WheelInput } from '@astroway/render/wheel-western';
import { AwElement, type ApiRequest, define } from './base.ts';
import { CHART_ATTRIBUTES, chartRequest } from './chart-request.ts';

/** <aw-aspect-grid key="pk_..." date=... latitude=... longitude=... [scroll]>. Layers A and C, like aw-natal-wheel. */
export class AwAspectGrid extends AwElement<WheelInput> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHART_ATTRIBUTES, 'scroll'];
  }

  protected request(): ApiRequest | null {
    const body = chartRequest(this);
    return body ? { layer: 'C', path: '/chart', body } : null;
  }

  protected draw(chart: WheelInput): string {
    /* Shrunk to a phone column the orb labels fall to ~4 px; `scroll` keeps the grid at its own size instead. */
    const scroll = this.hasAttribute('scroll') ? '<style>:host{display:block;max-width:100%;overflow-x:auto}svg{max-width:none}</style>' : '';
    return scroll + renderAspectGrid({ planets: chart.planets, aspects: chart.aspects ?? [] }, { theme: this.themeName });
  }
}

define('aw-aspect-grid', AwAspectGrid);
