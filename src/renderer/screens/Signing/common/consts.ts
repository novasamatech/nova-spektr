import { ChainId } from '@renderer/domain/shared-kernel';

const METADATA_PORTAL_URL = 'https://metadata.novasama.io/#/';
export const TROUBLESHOOTING_URL =
  'https://docs.novaspektr.io/create-and-sign-operations/create-and-sign-operation-faq';

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
  'text-text-white-button-background-default hover:text-text-white-button-background-hover active:text-text-white-button-background-active disabled:text-text-white-button-background-disabled';
