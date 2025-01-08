/* eslint-disable import-x/max-dependencies */

import DocumentIcon from '@/shared/assets/images/misc/document.svg?jsx';
import LogoTitleIcon from '@/shared/assets/images/misc/logo-title.svg?jsx';
import LogoIcon from '@/shared/assets/images/misc/logo.svg?jsx';
import NoResultsIcon from '@/shared/assets/images/misc/no-results.svg?jsx';
import NoWalletsIcon from '@/shared/assets/images/misc/no-wallets.svg?jsx';
import QrFrameIcon from '@/shared/assets/images/misc/qr-frame.svg?jsx';

const MiscImages = {
  logo: { svg: LogoIcon },
  logoTitle: { svg: LogoTitleIcon },
  qrFrame: { svg: QrFrameIcon },
  noResults: { svg: NoResultsIcon },
  noWallets: { svg: NoWalletsIcon },
  document: { svg: DocumentIcon, img: Document },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
