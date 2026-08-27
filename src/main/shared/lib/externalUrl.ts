import { ALLOWED_EXTERNAL_PROTOCOLS, ALLOWED_EXTERNAL_URLS } from '~shared/security/externalUrlPolicy';

/**
 * Decides whether a url requested by the renderer may be handed to the OS via
 * `shell.openExternal`.
 *
 * Allowed when either:
 *
 * - It is one of the first-party urls in `ALLOWED_EXTERNAL_URLS`, compared
 *   byte-for-byte (no normalisation, so `?x=1` suffixes or case variants fail),
 *   or
 * - Its scheme is in `ALLOWED_EXTERNAL_PROTOCOLS` (`https:`, `http:`, `mailto:`);
 *   the scheme is read from `new URL()` so it is case-insensitive.
 *
 * Unparsable input is rejected. The policy itself lives in
 * `src/shared/security/externalUrlPolicy.ts`, shared with the renderer.
 */
export function isAllowedExternalUrl(url: string): boolean {
  if (ALLOWED_EXTERNAL_URLS.has(url)) return true;

  try {
    return ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
