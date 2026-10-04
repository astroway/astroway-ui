// @vitest-environment node
import { describe, it, expect } from 'vitest';

/* Next.js, Nuxt and Astro evaluate client components on the server first, where
   there is no HTMLElement and no customElements. Importing must not throw there. */
describe('server-side import', () => {
  it('every element module loads without a DOM', async () => {
    expect(typeof (globalThis as { HTMLElement?: unknown }).HTMLElement).toBe('undefined');
    await expect(import('../src/index.ts')).resolves.toBeTruthy();
  });
});
