export const FRAME_SIZE = 512;

export const SUBSTRATE_ID = new Uint8Array([0x53]);
export const CRYPTO_STUB = new Uint8Array([0xff]);

export const DEFAULT_FRAME_DELAY = 50;
export const DEFAULT_MAX_FRAME_DELAY = 250;

export const enum Command {
  Transaction = 0x00,
  Message = 0x03,
  MultipleTransactions = 0x04,
  DynamicDerivationsTransaction = 0x05,
  TransactionWithProof = 0x06,
  DynamicDerivationsTransactionWithProof = 0x07,
  DynamicDerivationsRequestV1 = 0xdf,
  DynamicDerivationsExport = 0xde,
}
