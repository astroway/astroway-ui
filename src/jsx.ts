// Opt-in for React + TypeScript: `import '@astroway/ui/jsx'` once types the <aw-*> tags in JSX.
// Kept out of the main entry because augmenting 'react' fails to compile in projects without it.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type Num = string | number;
type Base = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  /** Publishable pk_ key; React keeps `key` for itself. */
  'api-key'?: string;
  api?: string;
  theme?: 'light' | 'dark';
  size?: Num;
  /** Layer A: data your server already fetched. Pass JSON.stringify(...) when the page is server-rendered. */
  data?: unknown;
};
type Birth = { date?: string; time?: string; latitude?: Num; longitude?: Num; 'timezone-offset'?: Num };
type Pair = { [k: `a-${string}`]: Num | undefined } & { [k: `b-${string}`]: Num | undefined };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'aw-natal-wheel': Base & Birth & { 'show-aspects'?: boolean | string };
      'aw-aspect-grid': Base & Birth & { scroll?: boolean | string };
      'aw-planet-table': Base & Birth;
      'aw-chinese-sign': Base & Birth;
      'aw-moon-phase': Base & { date?: string; 'show-label'?: boolean | string };
      'aw-planet-of-day': Base & { date?: string };
      'aw-horoscope': Base & { sign?: string; period?: 'daily' | 'weekly' | 'monthly'; date?: string };
      'aw-tarot-card': Base & { date?: string };
      'aw-tarot-spread': Base & { spread?: 'three-card' | 'celtic-cross'; date?: string };
      'aw-sign-matrix': Base & { 'sign-a'?: string; 'sign-b'?: string };
      'aw-synastry-score': Base & Pair;
    }
  }
}

export {};
