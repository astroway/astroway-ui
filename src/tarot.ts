import { AwElement, escapeHtml, type ApiRequest, define } from './base.ts';

interface Side { keywords: string[]; meaning: string }
interface Drawn { position: { index: number; name: string; meaning: string }; card: { slug: string; name: string; upright: Side; reversed: Side }; reversed: boolean }
interface Draw {
  date: string; drawn: Drawn[];
  localized?: { cards?: Record<string, { name?: string; upright?: Side; reversed?: Side }>; positions?: { index: number; name: string }[]; spread?: { name?: string } };
}

function cardHtml(d: Drawn, draw: Draw): string {
  const loc = draw.localized?.cards?.[d.card.slug];
  const side = d.reversed ? (loc?.reversed ?? d.card.reversed) : (loc?.upright ?? d.card.upright);
  const position = draw.localized?.positions?.find((p) => p.index === d.position.index)?.name ?? d.position.name;
  return `<article part="card" class="card${d.reversed ? ' reversed' : ''}">`
    + `<div part="position" class="pos">${escapeHtml(position)}</div>`
    + `<h3 part="name">${escapeHtml(loc?.name ?? d.card.name)}${d.reversed ? ' <span aria-label="reversed">⟲</span>' : ''}</h3>`
    + `<div part="keywords" class="kw">${side.keywords.map((k) => `<span>${escapeHtml(k)}</span>`).join('')}</div>`
    + `<p part="meaning">${escapeHtml(side.meaning)}</p></article>`;
}

const CSS = `<style>:host{display:block}.cards{display:grid;gap:.8em;grid-template-columns:repeat(auto-fit,minmax(min(100%,14em),1fr))}.card{padding:.9em 1em;border-radius:10px;border:1px solid var(--aw-border,rgba(127,127,127,.25));background:var(--aw-bg,transparent)}.pos{font-size:.75em;text-transform:uppercase;letter-spacing:.06em;opacity:.65}h3{margin:.2em 0 .4em;font-size:1.1em}.kw{display:flex;gap:.3em;flex-wrap:wrap;margin-bottom:.4em}.kw span{font-size:.78em;padding:.1em .5em;border-radius:999px;background:var(--aw-bg-soft,rgba(127,127,127,.1))}p{margin:0;line-height:1.5}</style>`;

/** <aw-tarot-card date="2026-10-04" lang="uk">: the card of the day. Layer B. */
export class AwTarotCard extends AwElement<Draw> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'date'];
  }

  protected request(): ApiRequest {
    const date = this.getAttribute('date') || new Date().toISOString().slice(0, 10);
    return { layer: 'B', path: `/public/tarot/daily?date=${encodeURIComponent(date)}` };
  }

  protected draw(d: Draw): string {
    return CSS + `<div class="cards">${d.drawn.map((x) => cardHtml(x, d)).join('')}</div>`;
  }
}

/** <aw-tarot-spread spread="three-card|celtic-cross" date="..." lang="uk">. Layer B. */
export class AwTarotSpread extends AwTarotCard {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'spread'];
  }

  protected request(): ApiRequest {
    const spread = this.getAttribute('spread') === 'celtic-cross' ? 'celtic-cross' : 'three-card';
    const date = this.getAttribute('date') || new Date().toISOString().slice(0, 10);
    return { layer: 'B', path: `/public/tarot/${spread}?date=${encodeURIComponent(date)}` };
  }
}

define('aw-tarot-card', AwTarotCard);
define('aw-tarot-spread', AwTarotSpread);
