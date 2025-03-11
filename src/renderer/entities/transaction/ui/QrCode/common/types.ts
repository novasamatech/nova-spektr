import { type Address, type ChainId, type CryptoType, type CryptoTypeString } from '@/shared/core';
import { type QrReaderError } from '@/shared/ui-kit';

import { type VaultFeature } from './constants';

export const enum DecodeQrError {
  FRAME_METADATA = 1000,
  NOT_RAPTOR_PACKAGE = 1001,
  NOT_SAME_QR = 1002,
}

export type Progress = {
  decoded: number;
  total: number;
};

export type MultiSigner<T extends string | Uint8Array> = {
  MultiSigner: Exclude<CryptoTypeString, CryptoTypeString.ETHEREUM>;
  public: T;
};

export type SeedInfo = {
  name: string;
  multiSigner: MultiSigner<Uint8Array>;
  derivedKeys: AddressInfo[];
  features?: VaultFeature[];
};

export type CompactSeedInfo = {
  address: Address;
  derivedKeys: Record<ChainId, AddressInfo[]>;
};

export type DdSeedInfo = {
  multiSigner: MultiSigner<Uint8Array>;
  dynamicDerivations: DdAddressInfo[];
};

export type AddressInfo = {
  // TODO: Eth would have HexString
  address: Address;
  derivationPath: string | undefined;
  encryption: CryptoType;
  genesisHash: Uint8Array;
};

export type DdAddressInfo = {
  publicKey: MultiSigner<Uint8Array>;
  derivationPath: string;
  encryption: CryptoType;
};

export type ErrorObject =
  | QrReaderError
  | {
      code: DecodeQrError;
      message: string;
    };

export type DdAddressInfoDecoded = {
  publicKey: MultiSigner<string>;
  derivationPath: string;
  encryption: CryptoType;
};

export type DynamicDerivationRequestInfo = {
  derivationPath: string;
  encryption: CryptoType;
  genesisHash: ChainId;
};
