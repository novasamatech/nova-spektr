/**
 * URL policy for the main-process fetch proxy (`IPC.PROXY.FETCH`).
 *
 * `session.fetch` honours no CSP and can read `file:` URLs, so the renderer
 * must never be able to steer it at an arbitrary target. Two layers apply:
 *
 * 1. Scheme rule (hard guarantee): `https:` anywhere, `http:` only to a loopback
 *    host (self-hosted dev backends). Nothing else — no `file:`, `data:`,
 *    `blob:`, no plaintext to the network.
 * 2. Origin pin (defence in depth): the request must target an origin the renderer
 *    registered as an address-book backend. A compromised renderer can pin
 *    whatever it likes, so this only narrows the blast radius; the scheme rule
 *    is what holds regardless.
 *
 * The pin is a set rather than a single value: the renderer pins per request,
 * and a reachability probe of an unsaved URL can be in flight next to a request
 * to the saved backend. With one slot the later pin would make the earlier
 * request fail as if it were blocked.
 */

const HTTPS = 'https:';
const HTTP = 'http:';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function hasAllowedScheme(url: URL): boolean {
  return url.protocol === HTTPS || (url.protocol === HTTP && isLoopbackHostname(url.hostname));
}

/** An origin the renderer may pin: https, or plaintext http on loopback only. */
export function isAllowedProxyOrigin(origin: string): boolean {
  const url = parseUrl(origin);

  return url !== null && hasAllowedScheme(url) && url.origin === origin;
}

/** Fails closed: with nothing pinned every request is denied. */
export function isAllowedProxyUrl(value: string, allowedOrigins: ReadonlySet<string>): boolean {
  if (allowedOrigins.size === 0) return false;

  const url = parseUrl(value);

  return url !== null && hasAllowedScheme(url) && allowedOrigins.has(url.origin);
}
