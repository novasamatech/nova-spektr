export const BASE_MATRIX_URL = 'https://matrix.org';

export const ROOM_CRYPTO_CONFIG = { algorithm: 'm.megolm.v1.aes-sha2' };

export const MATRIX_SHORT_USERNAME_REGEX = /^[a-z\d=_\-./]+$/i;

export const MATRIX_FULL_USERNAME_REGEX =
  /@[\w\d\-_]*:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i;

export const KEY_FILE_MAX_SIZE = 128;

export const WELL_KNOWN_SERVERS = [
  { domain: 'matrix.org', url: 'https://matrix.org' },
  { domain: 'matrix.parity.io', url: 'https://matrix.parity.io' },
  { domain: 'matrix.web3.foundation', url: 'https://matrix.web3.foundation' },
];
