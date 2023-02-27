export const FRAME_SIZE = 512;

export const SUBSTRATE_ID = new Uint8Array([0x53]);
export const CRYPTO_SR25519 = new Uint8Array([0x01]);
export const CRYPTO_ED25519 = new Uint8Array([0x00]);
export const CRYPTO_ECDSA = new Uint8Array([0x02]);
export const CRYPTO_STUB = new Uint8Array([0xff]);

export const DEFAULT_FRAME_DELAY = 50;
export const TIMER_INC = 1;

export const enum Command {
  Transaction = 0,
  Message = 3,
  MultipleTransactions = 4,
}
