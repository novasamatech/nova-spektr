export type HexString = `0x${string}`;
export type AccountID = string;
export type Threshold = number;
export type PublicKey = HexString;
export type ChainId = HexString;
export type EraIndex = number;

export const enum CryptoType {
  SR25519,
  ED25519,
  ECDSA,
  ETHEREUM,
}

export const enum ChainType {
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
  WATCH_ONLY = 'wallet_wo',
  SINGLE_PARITY_SIGNER = 'wallet_sps',
  MULTISHARD_PARITY_SIGNER = 'wallet_mps',
}

export const enum SigningType {
  WATCH_ONLY = 'signing_wo',
  PARITY_SIGNER = 'signing_ps',
  MULTISIG = 'signing_ms',
}
