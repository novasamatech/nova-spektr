import { OmniMstEvents } from './types';

export const BASE_MATRIX_URL = 'https://matrix.org';

export const ROOM_CRYPTO_CONFIG = { algorithm: 'm.megolm.v1.aes-sha2' };

export const MST_EVENTS = Object.values(OmniMstEvents);

export const MatrixUserNameRegex = /^@([a-z\d=_\-./]+):/;
