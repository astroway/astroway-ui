import { renderWesternWheel, type WheelInput } from '@astroway/render/wheel-western';
import { AwElement, type ApiRequest } from './base.ts';
import { CHART_ATTRIBUTES, chartRequest } from './chart-request.ts';

/**
 * <aw-natal-wheel key="pk_live_..." date="1990-05-15" time="14:30" latitude="50.45" longitude="30.52" timezone-offset="3">
 * Layer C: POST /v1/chart with a publishable pk_ key. Layer A: set `.data` to a /v1/chart response fetched server-side.
 * The SVG is drawn by @astroway/render, the same code behind /v1/render/wheel-western.
 */
export class AwNatalWheel extends AwElement<WheelInput> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHART_ATTRIBUTES, 'show-aspects'];
  }

  protected request(): ApiRequest | null {
    const body = chartRequest(this);
    return body ? { layer: 'C', path: '/chart', body } : null;
  }

  protected draw(chart: WheelInput): string {
    return renderWesternWheel(chart, {
      size: this.numberAttr('size', 500),
      theme: this.themeName,
      showAspects: this.getAttribute('show-aspects') !== 'false',
    });
  }
}

if (!customElements.get('aw-natal-wheel')) customElements.define('aw-natal-wheel', AwNatalWheel);
