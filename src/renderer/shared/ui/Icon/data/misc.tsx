import LogoImg, { ReactComponent as LogoSvg } from '@shared/assets/images/misc/logo.svg';
import LogoTitleImg, { ReactComponent as LogoTitleSvg } from '@shared/assets/images/misc/logo-title.svg';
import QrFrameImg, { ReactComponent as QrFrameSvg } from '@shared/assets/images/misc/qr-frame.svg';
import NoResults, { ReactComponent as NoResultsSvg } from '@shared/assets/images/misc/no-results.svg';
import NoWallets, { ReactComponent as NoWalletsSvg } from '@shared/assets/images/misc/no-wallets.svg';
import Document, { ReactComponent as DocumentSvg } from '@shared/assets/images/misc/document.svg';
import EmptyList from '@shared/assets/images/misc/empty-list.webp';
import Computer from '@shared/assets/images/misc/computer.webp';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
  logoTitle: { svg: LogoTitleSvg, img: LogoTitleImg },
  qrFrame: { svg: QrFrameSvg, img: QrFrameImg },
  noResults: { svg: NoResultsSvg, img: NoResults },
  noWallets: { svg: NoWalletsSvg, img: NoWallets },
  document: { svg: DocumentSvg, img: Document },
  emptyList: { svg: null, img: EmptyList },
  computer: { svg: null, img: Computer },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
