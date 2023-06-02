import { ChainId } from '@renderer/domain/shared-kernel';

const METADATA_PORTAL_URL = 'https://metadata.novasama.io/#/';
export const TROUBLESHOOTING_URL =
  'https://docs.novawallet.io/nova-wallet-wiki/help-and-support/troubleshooting#parity-signer-troubleshooting';

export const getMetadataPortalUrl = (chainId: ChainId) => `${METADATA_PORTAL_URL}${chainId}`;

export const enum CameraState {
  ACTIVE,
  LOADING,
  SELECT,
}

export const enum CameraError {
  UNKNOWN_ERROR = 3,
  INVALID_ERROR,
  DECODE_ERROR,
  DENY_ERROR,
}

export const CameraAccessErrors = [CameraError.UNKNOWN_ERROR, CameraError.DECODE_ERROR, CameraError.INVALID_ERROR];

export const CameraErrorText = {
  [CameraError.UNKNOWN_ERROR]: {
    label: 'onboarding.paritySigner.wrongQRCodeLabel',
    description: 'onboarding.paritySigner.wrongQRCodeDescription',
  },
  [CameraError.INVALID_ERROR]: {
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
