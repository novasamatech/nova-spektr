/**
 * URL policy for the main-process fetch proxy (`IPC.PROXY.FETCH`).
 *
 * `session.fetch` honours no CSP and can read `file:` URLs, so the renderer
 * must never be able to steer it at an arbitrary target. Two layers apply:
 *
 * 1. Scheme rule (hard guarantee): `https:` anywhere, `http:` only to a loopback
 *    host (self-hosted dev backends). Nothing else — no `file:`, `data:`,
 *    `blob:`, no plaintext to the network.
 * 2. Origin pin (defence in depth): the request must target the origin the
 *    renderer registered as its address-book backend. A compromised renderer
 *    can re-pin, so this only narrows the blast radius; the scheme rule is what
 *    holds regardless.
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

/** Fails closed: with no pinned origin every request is denied. */
export function isAllowedProxyUrl(value: string, allowedOrigin: string | null): boolean {
  if (allowedOrigin === null) return false;

  const url = parseUrl(value);

  return url !== null && hasAllowedScheme(url) && url.origin === allowedOrigin;
}
