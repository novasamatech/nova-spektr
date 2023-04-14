export const BASE_MATRIX_URL = 'https://matrix.org';

export const WELL_KNOWN_URI = '/.well-known/matrix/client';

export const ROOM_CRYPTO_CONFIG = { algorithm: 'm.megolm.v1.aes-sha2' };

export const MATRIX_USERNAME_REGEX = /^[a-z\d=_\-./]+$/i;

export const KEY_FILE_MAX_SIZE = 128;

export const SPEKTR_MULTISIG_EVENTS = {
  UPDATE: 'io.novafoundation.spektr.mst_updated',
  APPROVE: 'io.novafoundation.spektr.mst_approved',
  FINAL_APPROVE: 'io.novafoundation.spektr.mst_executed',
  CANCEL: 'io.novafoundation.spektr.mst_cancelled',
} as const;

export const WELL_KNOWN_SERVERS = [
  { domain: 'matrix.org', url: 'https://matrix.org' },
  { domain: 'matrix.parity.io', url: 'https://matrix.parity.io' },
  { domain: 'matrix.web3.foundation', url: 'https://matrix.web3.foundation' },
];
