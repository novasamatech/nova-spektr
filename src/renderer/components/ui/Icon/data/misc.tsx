import LogoImg, { ReactComponent as LogoSvg } from '@images/misc/logo.svg';
import QrFrameImg, { ReactComponent as QrFrameSvg } from '@images/misc/qr-frame.svg';
import EmptyImg, { ReactComponent as EmptySvg } from '@images/misc/empty.svg';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
  qrFrame: { svg: QrFrameSvg, img: QrFrameImg },
  empty: { svg: EmptySvg, img: EmptyImg },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
