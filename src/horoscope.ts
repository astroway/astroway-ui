import { AwElement, escapeHtml, type ApiRequest, define } from './base.ts';

interface Horoscope { sign: string; date: string; period: string; horoscope: string }

/* The API documents the prose as paragraphs, **bold** and hyphen bullets, never a heading. Escaped first, then marked up. */
export function renderProse(text: string): string {
  const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const BULLET = /^\s*[-•]\s+/;
  /* A block can open with a lead line ("**Tips**") and continue as a list, so lines are grouped
     into runs: consecutive bullets become one list, everything else one paragraph. */
  return text.trim().split(/\n{2,}/).map((block) => {
    let html = '';
    let para: string[] = [];
    let items: string[] = [];
    const flush = () => {
      if (para.length) html += `<p>${para.map(inline).join('<br>')}</p>`;
      if (items.length) html += `<ul>${items.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`;
      para = []; items = [];
    };
    for (const line of block.split('\n')) {
      if (BULLET.test(line)) {
        if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; }
        items.push(line.replace(BULLET, ''));
      } else {
        if (items.length) { html += `<ul>${items.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`; items = []; }
        para.push(line);
      }
    }
    flush();
    return html;
  }).join('');
}

/** <aw-horoscope sign="leo" period="daily" lang="uk">. Layer B. The page renders its own heading. */
export class AwHoroscope extends AwElement<Horoscope> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'sign', 'period', 'date'];
  }

  protected request(): ApiRequest | null {
    const sign = this.getAttribute('sign');
    if (!sign) return null;
    const period = ['daily', 'weekly', 'monthly'].includes(this.getAttribute('period') ?? '') ? this.getAttribute('period') : 'daily';
    const date = this.getAttribute('date');
    return { layer: 'B', path: `/public/horoscope/${period}?sign=${encodeURIComponent(sign)}${date ? `&date=${encodeURIComponent(date)}` : ''}` };
  }

  protected draw(d: Horoscope): string {
    return `<style>:host{display:block}p{margin:0 0 .8em;line-height:1.55}ul{margin:0 0 .8em;padding-left:1.2em}li{line-height:1.55}</style><div part="text">${renderProse(d.horoscope)}</div>`;
  }
}

define('aw-horoscope', AwHoroscope);
