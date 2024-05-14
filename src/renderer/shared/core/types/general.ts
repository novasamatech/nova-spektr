export type ID = number;
export type NoID<T extends { id: K }, K extends any = ID> = Omit<T, 'id'>;

export type HexString = `0x${string}`;
export type Metadata = HexString;
export type ChainId = HexString;
export type BlockHeight = number;

export type Address = string;
export type AccountId = HexString;
export type Threshold = number;

export type CallData = HexString;
export type CallHash = HexString;

export type EraIndex = number;
export type Timepoint = {
  height: number;
  index: number;
};

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
