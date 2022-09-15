import LogoImg, { ReactComponent as LogoSvg } from '@images/misc/logo.svg';
import QrFrameImg, { ReactComponent as QrFrameSvg } from '@images/misc/qr-frame.svg';
import NoResultImg, { ReactComponent as NoResultSvg } from '@images/misc/no-result.svg';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
  qrFrame: { svg: QrFrameSvg, img: QrFrameImg },
  noResult: { svg: NoResultSvg, img: NoResultImg },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
