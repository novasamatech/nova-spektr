import { array, Codec, object, option, sizedUint8Array, str, taggedUnion, u8, uint8Array } from 'parity-scale-codec';

import { CryptoType, CryptoTypeString, ChainId } from '@renderer/domain/shared-kernel';
import { AddressInfo, SeedInfo } from './types';

export const FRAME_KEY = 2;

export const ErrorFields = {
  CODE: 'code',
  MESSAGE: 'message',
};

const MULTI_SIGNER = taggedUnion('MultiSigner', [
  [CryptoTypeString.ED25519, ['public', sizedUint8Array(32)]],
  [CryptoTypeString.SR25519, ['public', sizedUint8Array(32)]],
  [CryptoTypeString.ECDSA, ['public', sizedUint8Array(33)]],
]);

const MULTI_SIGNATURE = taggedUnion('MultiSignature', [
  [CryptoTypeString.ED25519, ['signature', sizedUint8Array(64)]],
  [CryptoTypeString.SR25519, ['signature', sizedUint8Array(64)]],
  [CryptoTypeString.ECDSA, ['signature', sizedUint8Array(65)]],
]);

const ADDRESS_INFO: Codec<AddressInfo> = object(
  ['address', str],
  ['derivationPath', option(str)],
  ['encryption', u8 as Codec<CryptoType>],
  ['genesisHash', sizedUint8Array(32)],
);

const SEED_INFO: Codec<SeedInfo> = object(
  ['name', str],
  ['multiSigner', MULTI_SIGNER],
  ['derivedKeys', array(ADDRESS_INFO)],
);

// Export address format for decoding; Rust enum is a tagged union
export const EXPORT_ADDRESS = taggedUnion('ExportAddrs', [['V1', ['payload', array(SEED_INFO)]]]);
export const TRANSACTION_BULK = taggedUnion('TransactionBulk', [['V1', ['payload', array(uint8Array)]]]);
export const SIGNED_TRANSACTION_BULK = taggedUnion('SignaturesBulk', {
  4: ['V1', ['payload', array(MULTI_SIGNATURE)]],
});

const METADATA_PORTAL_METADATA_URL = 'https://metadata.novasama.io/?tab=1#/';
export const TROUBLESHOOTING_URL =
  'https://docs.novaspektr.io/create-and-sign-operations/create-and-sign-operation-faq';

export const getMetadataPortalMetadataUrl = (chainId: ChainId) => `${METADATA_PORTAL_METADATA_URL}${chainId}`;

export const enum CameraError {
  UNKNOWN_ERROR = 3,
  INVALID_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
}

export const CameraAccessErrors = [CameraError.UNKNOWN_ERROR, CameraError.DENY_ERROR, CameraError.DECODE_ERROR];

export const CameraErrorText = {
  [CameraError.INVALID_ERROR]: {
    label: 'onboarding.paritySigner.wrongQRCodeLabel',
    description: 'onboarding.paritySigner.wrongQRCodeDescription',
  },
  [CameraError.UNKNOWN_ERROR]: {
    label: 'onboarding.paritySigner.notWorkingLabel',
    description: 'onboarding.paritySigner.notWorkingDescription',
  },
  [CameraError.DECODE_ERROR]: {
    label: 'onboarding.paritySigner.decodeErrorLabel',
    description: 'onboarding.paritySigner.decodeErrorDescription',
  },
  [CameraError.DENY_ERROR]: {
    label: 'onboarding.paritySigner.accessDeniedLabel',
    description: 'onboarding.paritySigner.accessDeniedDescription',
  },
} as const;

export const WhiteTextButtonStyle =
  'text-white-button-background-default hover:text-white-button-background-hover active:text-white-button-background-active disabled:text-white-button-background-disabled';
