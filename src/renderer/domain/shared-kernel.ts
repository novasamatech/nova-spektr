export type HexString = `0x${string}`;

export type AccountID = string;
export type PublicKey = HexString;
export type ChainId = HexString;

export const enum CryptoType {
  SR25519,
  ED25519,
  ECDSA,
  ETHEREUM,
}

export const enum ErrorType {
  REQUIRED = 'required',
  VALIDATE = 'validate',
  PATTERN = 'pattern',
  MAX_LENGTH = 'maxLength',
}
