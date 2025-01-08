import { type Options } from 'qr-code-styling';

import NovaWalletOnboardingIcon from '@/shared/assets/images/walletTypes/novaWalletOnboarding.svg';
import WalletConnectOnboardingIcon from '@/shared/assets/images/walletTypes/walletConnectOnboarding.svg';

const QrConfig = {
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
} as Partial<Options>;

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
