import { SIGN_GLYPH } from '@astroway/render';
import { AwElement, escapeHtml, type ApiRequest } from './base.ts';

interface Pair { signA: string; signB: string; relation: string; tone: string }
interface Matrix {
  pairs: Pair[];
  localized?: { signs?: Record<string, string>; relations?: Record<string, string>; tones?: Record<string, string> };
}

const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const TONE_COLOR: Record<string, string> = { harmonious: 'var(--aw-good,#1a7f37)', challenging: 'var(--aw-danger,#b42318)', neutral: 'var(--aw-muted,#8c8c8c)' };

/**
 * <aw-sign-matrix sign-a="leo" sign-b="aries" lang="uk">: one pair, or the whole 12x12 grid without the attributes.
 * Layer B. The API gives relation and tone, never a score: a pair of signs has nothing to weigh.
 */
export class AwSignMatrix extends AwElement<Matrix> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'sign-a', 'sign-b'];
  }

  protected request(): ApiRequest {
    return { layer: 'B', path: '/public/compatibility/matrix' };
  }

  private find(d: Matrix, a: string, b: string): Pair | undefined {
    return d.pairs.find((p) => (p.signA === a && p.signB === b) || (p.signA === b && p.signB === a));
  }

  protected draw(d: Matrix): string {
    const L = d.localized ?? {};
    const name = (s: string) => escapeHtml(L.signs?.[s] ?? s);
    const a = this.getAttribute('sign-a')?.toLowerCase();
    const b = this.getAttribute('sign-b')?.toLowerCase();
    if (a && b) {
      const p = this.find(d, a, b);
      if (!p) return `<div part="error" class="state error">Unknown sign</div>`;
      return `<style>:host{display:block}.pair{text-align:center}.signs{font-size:1.2em;font-weight:600}.rel{margin-top:.3em}.tone{display:inline-block;margin-top:.4em;padding:.15em .7em;border-radius:999px;color:#fff;font-size:.85em}</style>`
        + `<div part="pair" class="pair"><div class="signs">${SIGN_GLYPH[SIGNS.indexOf(a)] ?? ''} ${name(a)} · ${SIGN_GLYPH[SIGNS.indexOf(b)] ?? ''} ${name(b)}</div>`
        + `<div part="relation" class="rel">${escapeHtml(L.relations?.[p.relation] ?? p.relation)}</div>`
        + `<span part="tone" class="tone" style="background:${TONE_COLOR[p.tone] ?? TONE_COLOR.neutral}">${escapeHtml(L.tones?.[p.tone] ?? p.tone)}</span></div>`;
    }
    const head = SIGNS.map((s, i) => `<th scope="col" title="${name(s)}">${SIGN_GLYPH[i]}</th>`).join('');
    const rows = SIGNS.map((r, i) => `<tr><th scope="row" title="${name(r)}">${SIGN_GLYPH[i]}</th>${SIGNS.map((c) => {
      const p = this.find(d, r, c)!;
      const label = `${name(r)} · ${name(c)}: ${escapeHtml(L.relations?.[p.relation] ?? p.relation)}`;
      return `<td title="${label}" aria-label="${label}" style="background:${TONE_COLOR[p.tone]}"></td>`;
    }).join('')}</tr>`).join('');
    /* Fills its container with square cells, so the grid fits a 320 px screen instead of overflowing it. */
    return `<style>:host{display:block;max-width:30em}table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:2px}th{font-weight:400;padding:0;font-size:.85em;text-align:center}td{aspect-ratio:1/1;border-radius:3px;opacity:.85}</style>`
      + `<table part="grid"><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }
}

if (!customElements.get('aw-sign-matrix')) customElements.define('aw-sign-matrix', AwSignMatrix);
