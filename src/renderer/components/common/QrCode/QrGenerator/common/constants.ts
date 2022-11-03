export const FRAME_SIZE = 128;
export const SUBSTRATE_ID = new Uint8Array([0x53]);
export const CRYPTO_SR25519 = new Uint8Array([0x01]);

export const DEFAULT_FRAME_DELAY = 50;
export const TIMER_INC = 10;

export const enum Command {
  Transaction = 0,
  Message = 3,
}
