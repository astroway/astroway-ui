import { renderMoonPhase } from '@astroway/render/moon-phase';
import { AwElement, escapeHtml, type ApiRequest } from './base.ts';

export interface MoonPhaseData {
  illuminationFraction: number;
  waxing: boolean;
  phaseName?: string;
  date?: string;
}

/**
 * <aw-moon-phase date="2026-10-04" lang="uk"></aw-moon-phase>
 * Layer B: GET /v1/public/moon-phase, no key. Layer A: set `.data` and nothing is fetched.
 */
export class AwMoonPhase extends AwElement<MoonPhaseData> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'date', 'show-label'];
  }

  protected request(): ApiRequest {
    const date = this.getAttribute('date') || new Date().toISOString().slice(0, 10);
    return { layer: 'B', path: `/public/moon-phase?date=${encodeURIComponent(date)}` };
  }

  protected fromResponse(data: unknown): MoonPhaseData {
    const d = data as { illuminationPercent: number; waxing: boolean; phaseName: string; date: string; localized?: { phaseName?: string } };
    return { illuminationFraction: d.illuminationPercent / 100, waxing: d.waxing, phaseName: d.localized?.phaseName ?? d.phaseName, date: d.date };
  }

  protected draw(d: MoonPhaseData): string {
    const svg = renderMoonPhase(
      { illuminationFraction: d.illuminationFraction, waxing: d.waxing, date: d.date },
      { size: this.numberAttr('size', 200), theme: this.themeName, showLabel: false },
    );
    const label = this.getAttribute('show-label') !== 'false' && d.phaseName
      ? `<div part="caption" class="caption">${escapeHtml(d.phaseName)}</div>` : '';
    return `<style>:host{display:block}svg{margin:0 auto}</style>` + svg + label;
  }
}

if (!customElements.get('aw-moon-phase')) customElements.define('aw-moon-phase', AwMoonPhase);
