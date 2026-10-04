import { AwElement, escapeHtml, type ApiRequest } from './base.ts';
import { CHART_ATTRIBUTES, chartRequest } from './chart-request.ts';

interface ChineseSign {
  animal: string; animalName?: string; glyph: string; element: { fixed: string; fixedName?: string; yin: boolean };
  text?: { name: string; character: string; strengths: string; caution: string };
}

/**
 * <aw-chinese-sign key="pk_..." date=... latitude=... longitude=...>
 * Layer C for the animal (POST /v1/chinese/zodiac/animal needs a key; the solar year turns at Lichun, not on 1 January),
 * then the keyless texts from /v1/public/chinese/zodiac/texts.
 */
export class AwChineseSign extends AwElement<ChineseSign> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, ...CHART_ATTRIBUTES];
  }

  protected request(): ApiRequest | null {
    const body = chartRequest(this);
    return body ? { layer: 'C', path: '/chinese/zodiac/animal', body } : null;
  }

  protected async fetchData(req: ApiRequest): Promise<{ data: unknown; footer?: string }> {
    const sign = (await super.fetchData(req)).data as ChineseSign;
    const texts = await super.fetchData({ layer: 'B', path: '/public/chinese/zodiac/texts' });
    const animals = (texts.data as { animals?: Record<string, ChineseSign['text']> }).animals ?? {};
    return { data: { ...sign, text: animals[sign.animal.toLowerCase()] }, footer: texts.footer };
  }

  protected draw(d: ChineseSign): string {
    const t = d.text;
    return `<style>.head{display:flex;gap:.6em;align-items:center}.g{font-size:2.4em;line-height:1}.n{font-size:1.25em;font-weight:600}.e{opacity:.75;font-size:.9em}p{margin:.5em 0 0;line-height:1.5}</style>`
      + `<div part="head" class="head"><span class="g" aria-hidden="true">${escapeHtml(d.glyph)}</span><div><div part="name" class="n">${escapeHtml(t?.name ?? d.animalName ?? d.animal)}</div>`
      + `<div part="element" class="e">${escapeHtml(d.element.fixedName ?? d.element.fixed)}</div></div></div>`
      + (t ? `<p part="character">${escapeHtml(t.character)}</p><p part="strengths">${escapeHtml(t.strengths)}</p><p part="caution">${escapeHtml(t.caution)}</p>` : '');
  }
}

if (!customElements.get('aw-chinese-sign')) customElements.define('aw-chinese-sign', AwChineseSign);
