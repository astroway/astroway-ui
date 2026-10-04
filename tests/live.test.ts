import { describe, it, expect } from 'vitest';
import '../src/index.ts';

/* One real keyless request against production per layer B element. Run with
   `npm run test:live`; it spends one unit of the caller's public budget. */
describe.runIf(process.env.LIVE === '1')('against production', () => {
  it('aw-moon-phase renders the public moon phase in Ukrainian', async () => {
    document.body.innerHTML = '<aw-moon-phase date="2026-10-04" lang="uk"></aw-moon-phase>';
    const el = document.body.firstElementChild as HTMLElement;
    const deadline = Date.now() + 15000;
    while (!el.shadowRoot!.innerHTML.includes('<svg') && !el.shadowRoot!.querySelector('[role="alert"]') && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(el.shadowRoot!.querySelector('[role="alert"]')?.textContent ?? '').toBe('');
    expect(el.shadowRoot!.innerHTML).toContain('<svg');
    expect(el.shadowRoot!.textContent).toContain('серп');
  });
});
