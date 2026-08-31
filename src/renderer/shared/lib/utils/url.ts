const WEB_PROTOCOLS = new Set(['https:', 'http:']);
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Normalizes a user/chain-provided website value into an http(s) URL.
 * Scheme-less values (`example.com`) get `https://`; anything with another
 * scheme (`file:`, `smb:`, `javascript:` ...), with credentials in the
 * authority (`user@host`) or unparsable is rejected. Returns the WHATWG
 * normalised href (lower-cased host, trailing slash).
 *
 * Note: a scheme-less host with a port (`example.com:8080`) parses as the
 * scheme `example.com:` and is therefore rejected.
 */
export const toWebUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!WEB_PROTOCOLS.has(url.protocol) || !url.hostname) return null;
    if (url.username || url.password) return null;

    return url.href;
  } catch {
    return null;
  }
};
