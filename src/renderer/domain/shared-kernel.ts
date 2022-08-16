export type HexString = `0x${string}`;

export type AccountID = string;
export type PublicKey = HexString;
export type ChainId = HexString;

// Move to DB ???
export const enum BooleanValue {
  FALSE = 0,
  TRUE = 1,
}

export const enum CryptoType {
  SR25519,
  ED25519,
  ECDSA,
  ETHEREUM,
}
