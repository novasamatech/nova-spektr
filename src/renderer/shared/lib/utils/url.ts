const WEB_PROTOCOLS = new Set(['https:', 'http:']);
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Normalizes a user/chain-provided website value into an http(s) URL.
 * Scheme-less values (`example.com`) get `https://`; anything with another
 * scheme (`file:`, `smb:`, `javascript:` ...) or unparsable is rejected.
 */
export const toWebUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    return WEB_PROTOCOLS.has(url.protocol) && url.hostname ? candidate : null;
  } catch {
    return null;
  }
};
