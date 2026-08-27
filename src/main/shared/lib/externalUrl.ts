/**
 * Schemes the app is allowed to hand to the OS via `shell.openExternal`.
 * Everything else (file:, smb:, search-ms:, vscode:, ...) would reach an
 * arbitrary protocol handler with attacker-controlled input (e.g. on-chain
 * identity links, markdown descriptions).
 */
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

export function isAllowedExternalUrl(url: string): boolean {
  try {
    return ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
