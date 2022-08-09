import LogoImg, { ReactComponent as LogoSvg } from '@images/misc/logo.svg';
import QrFrameImg, { ReactComponent as QrFrameSvg } from '@images/misc/qr-frame.svg';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
  qrFrame: { svg: QrFrameSvg, img: QrFrameImg },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
