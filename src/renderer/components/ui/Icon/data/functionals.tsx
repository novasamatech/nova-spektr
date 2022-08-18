import CopyImg, { ReactComponent as CopySvg } from '@images/functionals/copy.svg';
import QrImg, { ReactComponent as QrSvg } from '@images/functionals/qr.svg';
import QrSimpleImg, { ReactComponent as QrSimpleSvg } from '@images/functionals/qr-simple.svg';
import QrCutoutImg, { ReactComponent as QrCutoutSvg } from '@images/functionals/qr-cutout.svg';
import CheckCutoutImg, { ReactComponent as CheckCutoutSvg } from '@images/functionals/checkmark-cutout.svg';

const FunctionalImages = {
  copy: { svg: CopySvg, img: CopyImg },
  qr: { svg: QrSvg, img: QrImg },
  qrSimple: { svg: QrSimpleSvg, img: QrSimpleImg },
  qrCutout: { svg: QrCutoutSvg, img: QrCutoutImg },
  checkmarkCutout: { svg: CheckCutoutSvg, img: CheckCutoutImg },
} as const;

export type Functional = keyof typeof FunctionalImages;

export default FunctionalImages;
