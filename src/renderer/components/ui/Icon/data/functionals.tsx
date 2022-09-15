import CopyImg, { ReactComponent as CopySvg } from '@images/functionals/copy.svg';
import QrImg, { ReactComponent as QrSvg } from '@images/functionals/qr.svg';
import QrSimpleImg, { ReactComponent as QrSimpleSvg } from '@images/functionals/qr-simple.svg';
import QrCutoutImg, { ReactComponent as QrCutoutSvg } from '@images/functionals/qr-cutout.svg';
import CloseCutoutImg, { ReactComponent as CloseCutoutSvg } from '@images/functionals/close-cutout.svg';
import CheckCutoutImg, { ReactComponent as CheckCutoutSvg } from '@images/functionals/checkmark-cutout.svg';
import CheckImg, { ReactComponent as CheckSvg } from '@images/functionals/checkmark.svg';
import WarnCutoutImg, { ReactComponent as WarnCutoutSvg } from '@images/functionals/warning-cutout.svg';
import DisableCutoutImg, { ReactComponent as DisableCutoutSvg } from '@images/functionals/disable-cutout.svg';
import RemoveCutoutImg, { ReactComponent as RemoveCutoutSvg } from '@images/functionals/remove-cutout.svg';
import EmptyIdenticonImg, { ReactComponent as EmptyIdenticonSvg } from '@images/functionals/empty-identicon.svg';
import SearchImg, { ReactComponent as SearchSvg } from '@images/functionals/search.svg';
import NetworkDuotoneImg, { ReactComponent as NetworkDuotoneSvg } from '@images/functionals/network-duotone.svg';
import NetworkOnImg, { ReactComponent as NetworkOnSvg } from '@images/functionals/network-on.svg';
import NetworkOffImg, { ReactComponent as NetworkOffSvg } from '@images/functionals/network-off.svg';
import NetworkImg, { ReactComponent as NetworkSvg } from '@images/functionals/network.svg';

const FunctionalImages = {
  copy: { svg: CopySvg, img: CopyImg },
  qr: { svg: QrSvg, img: QrImg },
  qrSimple: { svg: QrSimpleSvg, img: QrSimpleImg },
  qrCutout: { svg: QrCutoutSvg, img: QrCutoutImg },
  closeCutout: { svg: CloseCutoutSvg, img: CloseCutoutImg },
  checkmarkCutout: { svg: CheckCutoutSvg, img: CheckCutoutImg },
  checkmark: { svg: CheckSvg, img: CheckImg },
  warnCutout: { svg: WarnCutoutSvg, img: WarnCutoutImg },
  disableCutout: { svg: DisableCutoutSvg, img: DisableCutoutImg },
  removeCutout: { svg: RemoveCutoutSvg, img: RemoveCutoutImg },
  emptyIdenticon: { svg: EmptyIdenticonSvg, img: EmptyIdenticonImg },
  search: { svg: SearchSvg, img: SearchImg },
  networkDuotone: { svg: NetworkDuotoneSvg, img: NetworkDuotoneImg },
  networkOn: { svg: NetworkOnSvg, img: NetworkOnImg },
  networkOff: { svg: NetworkOffSvg, img: NetworkOffImg },
  network: { svg: NetworkSvg, img: NetworkImg },
} as const;

export type Functional = keyof typeof FunctionalImages;

export default FunctionalImages;
