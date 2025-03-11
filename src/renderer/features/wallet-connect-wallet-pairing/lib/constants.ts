import { type Options } from 'qr-code-styling';

import NovaWalletOnboardingIcon from '@/shared/assets/images/walletTypes/novaWalletOnboarding.svg';
import WalletConnectOnboardingIcon from '@/shared/assets/images/walletTypes/walletConnectOnboarding.svg';
import { type ChainId } from '@/shared/core';

// Polkadot People
export const IDENTITY_CHAIN: ChainId = '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008';

const QrConfig: Partial<Options> = {
  width: 300,
  height: 300,
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 1,
    margin: 10,
  },
  qrOptions: {
    typeNumber: 0,
    mode: 'Byte',
    errorCorrectionLevel: 'L',
  },
  type: 'svg',
  dotsOptions: {
    type: 'dots',
    color: '#ff009d',
    gradient: {
      type: 'linear',
      rotation: 0.7853981633974483,
      colorStops: [
        { offset: 0, color: '#3384fe' },
        { offset: 1, color: '#075dc1' },
      ],
    },
  },
  backgroundOptions: { color: '#ffffff' },
  cornersSquareOptions: {
    type: 'extra-rounded',
    color: '#000000',
  },
  cornersDotOptions: { type: undefined, color: '#000000', gradient: undefined },
};

export const WCQRConfig = {
  ...QrConfig,
  image: WalletConnectOnboardingIcon,
};

export const NWQRConfig = {
  ...QrConfig,
  image: NovaWalletOnboardingIcon,
};

export const enum Step {
  CLOSED,
  SCAN,
  MANAGE,
  REJECT,
  SUCCESS,
}

export const EXPIRE_TIMEOUT = 5 * 60 * 1000;

export const WALLET_NAME_MAX_LENGTH = 256;
