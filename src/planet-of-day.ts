import { AwElement, escapeHtml, type ApiRequest } from './base.ts';

interface PlanetOfDay {
  date: string; planet: string; glyph: string; weekday: string; themes: string[];
  localized?: { planet?: string; weekday?: string };
}

/** <aw-planet-of-day date="2026-10-04" lang="uk">. Layer B. Themes are an open English set, shown only in English. */
export class AwPlanetOfDay extends AwElement<PlanetOfDay> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'date'];
  }

  protected request(): ApiRequest {
    const date = this.getAttribute('date') || new Date().toISOString().slice(0, 10);
    return { layer: 'B', path: `/public/planet-of-day?date=${encodeURIComponent(date)}` };
  }

  protected draw(d: PlanetOfDay): string {
    const themes = this.language.startsWith('en') && d.themes?.length
      ? `<div part="themes" class="themes">${d.themes.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : '';
    return `<style>.wrap{text-align:center}.g{font-size:3em;line-height:1;color:var(--aw-accent,#0b5fbf)}.n{font-size:1.2em;font-weight:600;margin-top:.2em}.w{opacity:.75}.themes{display:flex;gap:.3em;flex-wrap:wrap;justify-content:center;margin-top:.5em}.themes span{font-size:.8em;padding:.15em .55em;border-radius:999px;background:var(--aw-bg-soft,rgba(127,127,127,.1))}</style>`
      + `<div part="card" class="wrap"><div class="g" aria-hidden="true">${escapeHtml(d.glyph)}</div>`
      + `<div part="planet" class="n">${escapeHtml(d.localized?.planet ?? d.planet)}</div>`
      + `<div part="weekday" class="w">${escapeHtml(d.localized?.weekday ?? d.weekday)}</div>${themes}</div>`;
  }
}

if (!customElements.get('aw-planet-of-day')) customElements.define('aw-planet-of-day', AwPlanetOfDay);
