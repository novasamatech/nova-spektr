// eslint-disable-next-line import/named
import { type DecodeContinuouslyCallback } from '@zxing/browser/esm/common/DecodeContinuouslyCallback';

import type { Address, ChainId, CryptoType, CryptoTypeString } from '@shared/core';
import type { VaultFeature } from './constants';

export const enum QrError {
  USER_DENY,
  NO_VIDEO_INPUT,
  BAD_NEW_CAMERA,
  FRAME_METADATA,
  NOT_RAPTOR_PACKAGE,
  NOT_SAME_QR,
  DECODE_ERROR,
}

export type DecodeCallback = DecodeContinuouslyCallback;

export type VideoInput = {
  id: string;
  label: string;
};

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

export type ErrorObject = {
  code: QrError;
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
