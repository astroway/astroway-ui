import { AwElement, escapeHtml, type ApiRequest, define } from './base.ts';

interface ChineseSign {
  animal: string; animalName?: string; glyph: string; element: { fixed: string; fixedName?: string; yin: boolean };
  text?: { name: string; character: string; strengths: string; caution: string };
}

/**
 * <aw-chinese-sign date="1990-05-15" [time] [timezone-offset]>. Layers A and B: the animal from
 * /v1/public/chinese/zodiac/animal, then the reading from /v1/public/chinese/zodiac/texts.
 */
export class AwChineseSign extends AwElement<ChineseSign> {
  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'date', 'time', 'timezone-offset'];
  }

  protected request(): ApiRequest | null {
    const date = this.getAttribute('date');
    if (!date) return null;
    // The year turns at Li Chun (around 4 February), so a clock the page did not give is not invented.
    const body: Record<string, unknown> = { date };
    const time = this.getAttribute('time');
    if (time) body.time = time.length === 5 ? `${time}:00` : time;
    const tz = Number(this.getAttribute('timezone-offset'));
    if (this.hasAttribute('timezone-offset') && Number.isFinite(tz)) body.timezoneOffset = tz;
    return { layer: 'B', path: '/public/chinese/zodiac/animal', body };
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

define('aw-chinese-sign', AwChineseSign);
