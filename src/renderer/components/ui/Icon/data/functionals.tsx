import CopyImg, { ReactComponent as CopySvg } from '@images/functionals/copy.svg';
import QrImg, { ReactComponent as QrSvg } from '@images/functionals/qr.svg';
import QrSimpleImg, { ReactComponent as QrSimpleSvg } from '@images/functionals/qr-simple.svg';
import QrCutoutImg, { ReactComponent as QrCutoutSvg } from '@images/functionals/qr-cutout.svg';
import CheckCutoutImg, { ReactComponent as CheckCutoutSvg } from '@images/functionals/checkmark-cutout.svg';
import WarnCutoutImg, { ReactComponent as WarnCutoutSvg } from '@images/functionals/warning-cutout.svg';
import RemoveCutoutImg, { ReactComponent as RemoveCutoutSvg } from '@images/functionals/remove-cutout.svg';
import EmptyIdenticonImg, { ReactComponent as EmptyIdenticonSvg } from '@images/functionals/empty-identicon.svg';

const FunctionalImages = {
  copy: { svg: CopySvg, img: CopyImg },
  qr: { svg: QrSvg, img: QrImg },
  qrSimple: { svg: QrSimpleSvg, img: QrSimpleImg },
  qrCutout: { svg: QrCutoutSvg, img: QrCutoutImg },
  checkmarkCutout: { svg: CheckCutoutSvg, img: CheckCutoutImg },
  warnCutout: { svg: WarnCutoutSvg, img: WarnCutoutImg },
  removeCutout: { svg: RemoveCutoutSvg, img: RemoveCutoutImg },
  emptyIdenticon: { svg: EmptyIdenticonSvg, img: EmptyIdenticonImg },
} as const;

export type Functional = keyof typeof FunctionalImages;

export default FunctionalImages;
