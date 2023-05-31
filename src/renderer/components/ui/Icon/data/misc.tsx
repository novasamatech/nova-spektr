import LogoImg, { ReactComponent as LogoSvg } from '@images/misc/logo.svg';
import QrFrameImg, { ReactComponent as QrFrameSvg } from '@images/misc/qr-frame.svg';
import NoResults, { ReactComponent as NoResultsSvg } from '@images/misc/no-results.svg';
import NoWallets, { ReactComponent as NoWalletsSvg } from '@images/misc/no-wallets.svg';
import EmptyList from '@images/misc/empty-list.webp';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
  qrFrame: { svg: QrFrameSvg, img: QrFrameImg },
  noResults: { svg: NoResultsSvg, img: NoResults },
  noWallets: { svg: NoWalletsSvg, img: NoWallets },
  emptyList: { svg: null, img: EmptyList },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
