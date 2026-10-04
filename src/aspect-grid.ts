import { renderAspectGrid } from '@astroway/render/aspect-grid';
import type { WheelInput } from '@astroway/render/wheel-western';
import { AwElement, type ApiRequest } from './base.ts';
import { CHART_ATTRIBUTES, chartRequest } from './chart-request.ts';

/** <aw-aspect-grid key="pk_..." date=... latitude=... longitude=...>. Layers A and C, like aw-natal-wheel. */
export class AwAspectGrid extends AwElement<WheelInput> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHART_ATTRIBUTES];
  }

  protected request(): ApiRequest | null {
    const body = chartRequest(this);
    return body ? { layer: 'C', path: '/chart', body } : null;
  }

  protected draw(chart: WheelInput): string {
    return renderAspectGrid({ planets: chart.planets, aspects: chart.aspects ?? [] }, { theme: this.themeName });
  }
}

if (!customElements.get('aw-aspect-grid')) customElements.define('aw-aspect-grid', AwAspectGrid);
