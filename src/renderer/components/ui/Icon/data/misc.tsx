import LogoImg, { ReactComponent as LogoSvg } from '@images/misc/logo.svg';
import QrFrameImg, { ReactComponent as QrFrameSvg } from '@images/misc/qr-frame.svg';
import NoResultVar1Img, { ReactComponent as NoResultVar1Svg } from '@images/misc/no-result-1.svg';
import NoResultVar2Img, { ReactComponent as NoResultVar2Svg } from '@images/misc/no-result-2.svg';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
  qrFrame: { svg: QrFrameSvg, img: QrFrameImg },
  noResultVar1: { svg: NoResultVar1Svg, img: NoResultVar1Img },
  noResultVar2: { svg: NoResultVar2Svg, img: NoResultVar2Img },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
