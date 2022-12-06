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

export const enum ChainClass {
  SUBSTRATE,
  ETHEREUM,
}

export const enum CryptoTypeString {
  SR25519 = 'SR25519',
  ED25519 = 'ED25519',
  ECDSA = 'ECDSA',
  ETHEREUM = 'ETHEREUM',
}

export const enum ErrorType {
  REQUIRED = 'required',
  VALIDATE = 'validate',
  PATTERN = 'pattern',
  MAX_LENGTH = 'maxLength',
}

export const enum WalletType {
  WATCH_ONLY,
  SINGLE_PARITY_SIGNER,
  MULTISHARD_PARITY_SIGNER,
}

export const enum SigningType {
  WATCH_ONLY,
  PARITY_SIGNER,
}
