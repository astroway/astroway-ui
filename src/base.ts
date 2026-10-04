// Shared base for every <aw-*> element: attributes, layer A data, keyless and pk_ fetches,
// loading / error / rate-limited states, per-session caching and the attribution footer.

export const DEFAULT_API = 'https://api.astroway.info/v1';

export interface ApiRequest {
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  /* B calls /public/* and /embed/* with no key; C sends the element's pk_ key. */
  layer: 'B' | 'C';
}

export class AwError extends Error {
  constructor(message: string, readonly kind: 'error' | 'rate-limited' | 'key', readonly retryAfterSec?: number) {
    super(message);
  }
}

const BASE_ATTRIBUTES = ['lang', 'theme', 'size', 'key', 'api-key', 'api', 'data'];

/* A secret key in page source is readable by every visitor, so it is refused before any request leaves. */
export function checkBrowserKey(key: string | null): string | null {
  if (!key) return null;
  if (/^aw_(live|test)_/.test(key)) {
    throw new AwError('This is a secret aw_ key. Never put it in a page: create a publishable pk_ key for this site in the dashboard.', 'key');
  }
  if (!key.startsWith('pk_')) throw new AwError('The api-key attribute takes a publishable pk_ key.', 'key');
  return key;
}

function retryAfter(res: Response, body: unknown): number | undefined {
  const header = Number(res.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header;
  const msg = String((body as { error?: { message?: string } })?.error?.message ?? '');
  const m = /\bin (\d+)\s*s\b/i.exec(msg);
  return m ? Number(m[1]) : undefined;
}

const inflight = new Map<string, Promise<{ data: unknown; footer?: string }>>();

function cacheGet(id: string): unknown {
  try {
    const raw = sessionStorage.getItem(id);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function cacheSet(id: string, value: unknown): void {
  try {
    sessionStorage.setItem(id, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the next load simply asks again.
  }
}

/* On a server render (Next.js, Nuxt, Astro) the module is evaluated with no DOM; the
   element then stays a plain tag in the HTML and upgrades once the browser loads it. */
const ElementBase = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export function define(name: string, ctor: CustomElementConstructor): void {
  if (typeof customElements !== 'undefined' && !customElements.get(name)) customElements.define(name, ctor);
}

export abstract class AwElement<T = unknown> extends ElementBase {
  static get observedAttributes(): string[] {
    return BASE_ATTRIBUTES;
  }

  protected readonly root: ShadowRoot;
  #data: T | undefined;
  #run = 0;
  #queued = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  /** Layer A: hand the element data your server already fetched; no request is made. */
  set data(value: T | undefined) {
    this.#data = value;
    this.schedule();
  }

  get data(): T | undefined {
    return this.#data;
  }

  /* One render per task: `el.data = ...` or a run of setAttribute right after
     insertion lands before the first paint, so a layer A element never fires
     the request its data was meant to replace. */
  protected schedule(): void {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) void this.update();
    });
  }

  connectedCallback(): void {
    this.schedule();
  }

  attributeChangedCallback(): void {
    this.schedule();
  }

  protected get language(): string {
    return this.getAttribute('lang') || document.documentElement.lang || 'en';
  }

  protected get themeName(): string {
    return this.getAttribute('theme') || 'light';
  }

  protected numberAttr(name: string, fallback: number): number {
    const n = Number(this.getAttribute(name));
    return this.hasAttribute(name) && Number.isFinite(n) ? n : fallback;
  }

  /** What to fetch when no data was given, or null when the inputs are incomplete. */
  protected abstract request(): ApiRequest | null;

  /** Turns the API's `data` into the element's own shape. */
  protected fromResponse(data: unknown): T {
    return data as T;
  }

  /** Markup for the shadow root. */
  protected abstract draw(data: T): string;

  async update(): Promise<void> {
    const run = ++this.#run;
    try {
      const given = this.#data ?? this.dataAttribute();
      if (given !== undefined) {
        this.paint(this.draw(given));
        return;
      }
      const req = this.request();
      if (!req) return;
      this.paint('<div part="loading" class="state">…</div>');
      const { data, footer } = await this.fetchData(req);
      if (run !== this.#run) return;
      this.paint(this.draw(this.fromResponse(data)) + (footer ? `<div part="footer" class="footer">${escapeHtml(footer)}</div>` : ''));
    } catch (e) {
      if (run !== this.#run) return;
      const err = e instanceof AwError ? e : new AwError((e as Error)?.message || 'Request failed', 'error');
      const wait = err.retryAfterSec ? ` Try again in ${Math.ceil(err.retryAfterSec / 60)} min.` : '';
      this.paint(`<div part="${err.kind}" class="state ${err.kind}" role="alert">${escapeHtml(err.message + wait)}</div>`);
      this.dispatchEvent(new CustomEvent('aw-error', { detail: { kind: err.kind, message: err.message }, bubbles: true, composed: true }));
    }
  }

  /* A server render (React SSR, PHP, WordPress) can only write strings, and React does not
     set object props on a custom element it hydrates, so layer A also reads JSON from the attribute. */
  private dataAttribute(): T | undefined {
    const raw = this.getAttribute('data');
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new AwError('The data attribute is not valid JSON.', 'error');
    }
  }

  protected async fetchData(req: ApiRequest): Promise<{ data: unknown; footer?: string }> {
    // React reserves `key` and never passes it to the element, so `api-key` is the spelling that works everywhere.
    const key = req.layer === 'C' ? checkBrowserKey(this.getAttribute('api-key') ?? this.getAttribute('key')) : null;
    if (req.layer === 'C' && !key) throw new AwError('This element needs a publishable pk_ key in its api-key attribute.', 'key');
    const base = (this.getAttribute('api') || DEFAULT_API).replace(/\/+$/, '');
    const sep = req.path.includes('?') ? '&' : '?';
    const url = `${base}${req.path}${sep}lang=${encodeURIComponent(this.language)}`;
    const body = req.body === undefined ? undefined : JSON.stringify(req.body);
    const cacheId = `aw:${url}:${body ?? ''}`;
    const cached = cacheGet(cacheId) as { data: unknown; footer?: string } | undefined;
    if (cached) return cached;
    // Elements drawn from the same chart mount together; one request, not one charge each.
    let pending = inflight.get(cacheId);
    if (!pending) {
      pending = this.send(url, req, body, key, cacheId).finally(() => inflight.delete(cacheId));
      inflight.set(cacheId, pending);
    }
    return pending;
  }

  private async send(url: string, req: ApiRequest, body: string | undefined, key: string | null, cacheId: string): Promise<{ data: unknown; footer?: string }> {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (key) headers['X-Api-Key'] = key;
    let res: Response;
    try {
      res = await fetch(url, { method: req.method ?? (body ? 'POST' : 'GET'), headers, body });
    } catch {
      // A refused origin comes back without CORS headers, so the browser shows only a network error.
      if (key) throw new AwError("The request was blocked. Check that this site's origin is in the key's allowed origins.", 'key');
      throw new AwError('Could not reach the AstroWay API.', 'error');
    }
    let json: { ok?: boolean; data?: unknown; _footer?: string; error?: { message?: string } } = {};
    try {
      json = await res.json();
    } catch {
      // A non-JSON answer is reported by status below.
    }
    if (res.status === 429) throw new AwError('The free request budget for this page is used up for now.', 'rate-limited', retryAfter(res, json));
    if (!res.ok || json.ok === false) throw new AwError(json.error?.message || `Request failed (${res.status})`, 'error');
    const result = { data: json.data, footer: json._footer };
    cacheSet(cacheId, result);
    return result;
  }

  private paint(inner: string): void {
    this.root.innerHTML = `<style>${BASE_CSS}</style>${inner}`;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/* Token names follow the API site's own (--accent becomes --aw-accent), so a page can theme every element at once. */
const BASE_CSS = `
:host { display: inline-block; color: var(--aw-fg, inherit); font-family: var(--aw-font, system-ui, sans-serif); }
:host([hidden]) { display: none; }
svg { display: block; max-width: 100%; height: auto; }
.state { padding: .75em 1em; border-radius: 8px; background: var(--aw-bg-soft, rgba(127,127,127,.08)); font-size: .9em; }
.error, .key { color: var(--aw-danger, #b42318); }
.rate-limited { color: var(--aw-warning, #9a6700); }
.caption { margin-top: .4em; text-align: center; font-size: .95em; }
.footer { margin-top: .4em; font-size: .75em; opacity: .7; text-align: center; }
`;
