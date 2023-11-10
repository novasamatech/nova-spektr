// eslint-disable-next-line import/named
import { DecodeContinuouslyCallback } from '@zxing/browser/esm/common/DecodeContinuouslyCallback';

import type { Address, CryptoType, CryptoTypeString, ChainId } from '@renderer/shared/core';

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

// Public root key
export type MultiSigner = {
  MultiSigner: Exclude<CryptoTypeString, CryptoTypeString.ETHEREUM>;
  public: Uint8Array;
};

export type SeedInfo = {
  name: string;
  multiSigner: MultiSigner;
  derivedKeys: AddressInfo[];
};

export type CompactSeedInfo = {
  address: Address;
  derivedKeys: Record<ChainId, AddressInfo[]>;
};

export type DdSeedInfo = {
  multiSigner: MultiSigner;
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
  publicKey: MultiSigner;
  derivationPath: string;
  encryption: CryptoType;
};

export type ErrorObject = {
  code: QrError;
  message: string;
};

export type DdAddressInfoDecoded = {
  publicKey: { MultiSigner: Exclude<CryptoTypeString, CryptoTypeString.ETHEREUM>; public: string };
  derivationPath: string;
  encryption: CryptoType;
};

export type DynamicDerivationRequestInfo = {
  derivationPath: string;
  encryption: CryptoType;
  genesisHash: ChainId;
};
