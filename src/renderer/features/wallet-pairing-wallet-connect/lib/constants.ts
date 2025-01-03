import { type Options } from 'qr-code-styling';

import WalletTypeImages from '@/shared/ui/Icon/data/walletType';

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
  image: WalletTypeImages.walletConnectOnboarding.img,
};

export const NWQRConfig = {
  ...QrConfig,
  image: WalletTypeImages.novaWalletOnboarding.img,
};
