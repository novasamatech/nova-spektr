import { OmniMstEvent } from './types';

export const BASE_MATRIX_URL = 'https://matrix.org';

export const WELL_KNOWN_URI = '/.well-known/matrix/client';

export const ROOM_CRYPTO_CONFIG = { algorithm: 'm.megolm.v1.aes-sha2' };

export const MST_EVENTS = Object.values(OmniMstEvent);

export const MATRIX_USERNAME_REGEX = /^[a-z\d=_\-./]+$/i;

export const KEY_FILE_MAX_SIZE = 128;

export const WELL_KNOWN_SERVERS = [
  { domain: 'matrix.org', url: 'https://matrix.org' },
  { domain: 'matrix.parity.io', url: 'https://matrix.parity.io' },
  { domain: 'matrix.web3.foundation', url: 'https://matrix.web3.foundation' },
];
