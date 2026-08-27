/**
 * Policy for urls the app may hand to the OS via `shell.openExternal`.
 *
 * Shared between the main process (enforcement in `setWindowOpenHandler`) and
 * the renderer (first-party deep links), so the two can't drift.
 */

/**
 * Schemes that may be opened externally. Everything else (file:, smb:,
 * search-ms:, vscode:, ...) would reach an arbitrary protocol handler with
 * attacker-controlled input (on-chain identity links, markdown descriptions).
 */
export const ALLOWED_EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:', 'mailto:']);

/** OS settings deep links opened from the camera-access alert. */
export const CAMERA_SETTINGS_URL = {
  MAC: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
  WINDOWS: 'ms-settings:privacy-webcam',
} as const;

/**
 * First-party urls on otherwise blocked schemes, allowed by exact match only.
 * Never derive entries from user or chain input.
 */
export const ALLOWED_EXTERNAL_URLS: ReadonlySet<string> = new Set<string>(Object.values(CAMERA_SETTINGS_URL));
