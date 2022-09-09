export const FRAME_SIZE = 1024;
export const SUBSTRATE_ID = new Uint8Array([0x53]);
export const CRYPTO_SR25519 = new Uint8Array([0x01]);

export const DEFAULT_FRAME_DELAY = 2750;
export const TIMER_INC = 500;

export const enum Command {
  Transaction = 0,
  Message = 3,
}
