import CopyImg, { ReactComponent as CopySvg } from '@images/functionals/copy.svg';
import QrImg, { ReactComponent as QrSvg } from '@images/functionals/qr.svg';
import CheckCutImg, { ReactComponent as CheckCutSvg } from '@images/functionals/checkmark-cutout.svg';

const FunctionalImages = {
  copy: { svg: CopySvg, img: CopyImg },
  qr: { svg: QrSvg, img: QrImg },
  checkCut: { svg: CheckCutSvg, img: CheckCutImg },
} as const;

export type Functional = keyof typeof FunctionalImages;

export default FunctionalImages;
