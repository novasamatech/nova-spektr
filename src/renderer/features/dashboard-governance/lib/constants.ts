/**
 * The chain filter's "every chain" option. `Select` needs a value for it, and
 * the filter itself is `null` — the sentinel never leaves the picker.
 */
export const ALL_CHAINS = '__all__';

/**
 * The one date format the tab prints: unlock estimates and ended-referendum
 * dates alike, so two dates about the same lock never disagree on shape.
 */
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';

/**
 * How long the referendum modal waits for its chain to connect before it says
 * so. Long enough for a slow node handshake, short enough that a spinner which
 * will never resolve is not left alone with a close button.
 */
export const NETWORK_WAIT_TIMEOUT_MS = 15_000;
