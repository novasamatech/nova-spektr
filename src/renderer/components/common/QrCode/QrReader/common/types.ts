import { CryptoType } from '@renderer/domain/shared-kernel';

export const enum QrError {
  USER_DENY,
  NO_VIDEO_INPUT,
  BAD_NEW_CAMERA,
  FRAME_METADATA,
  NOT_RAPTOR_PACKAGE,
  NOT_SAME_QR,
  DECODE_ERROR,
}

export type VideoInput = {
  id: string;
  label: string;
};

export type Progress = {
  decoded: number;
  total: number;
};

type CryptoWithoutEthereum = Exclude<keyof typeof CryptoType, 'ETHEREUM'>;

// Public root key
type MultiSigner = {
  MultiSigner: Capitalize<Lowercase<CryptoWithoutEthereum>>;
  public: Uint8Array;
};

export type SeedInfo = {
  name: string;
  multiSigner: MultiSigner | undefined;
  derivedKeys: AddressInfo[];
};

export type AddressInfo = {
  address: string;
  derivationPath: string | undefined;
  encryption: CryptoType;
  genesisHash: Uint8Array;
};

export type ErrorObject = {
  code: QrError;
  message: string;
};
