import ArrowUpImg, { ReactComponent as ArrowUpSvg } from '@images/arrows/up.svg';
import ArrowDownImg, { ReactComponent as ArrowDownSvg } from '@images/arrows/down.svg';
import ArrowLeftImg, { ReactComponent as ArrowLeftSvg } from '@images/arrows/left.svg';
import ArrowLeftCutoutImg, { ReactComponent as ArrowLeftCutoutSvg } from '@images/arrows/left-cutout.svg';
import SendArrowImg, { ReactComponent as SendArrowSvg } from '@images/arrows/send-arrow.svg';
import ReceiveArrowImg, { ReactComponent as ReceiveArrowSvg } from '@images/arrows/receive-arrow.svg';

const ArrowImages = {
  arrowUp: { svg: ArrowUpSvg, img: ArrowUpImg },
  arrowDown: { svg: ArrowDownSvg, img: ArrowDownImg },
  arrowLeftCutout: { svg: ArrowLeftCutoutSvg, img: ArrowLeftCutoutImg },
  arrowLeft: { svg: ArrowLeftSvg, img: ArrowLeftImg },
  sendArrow: { svg: SendArrowSvg, img: SendArrowImg },
  receiveArrow: { svg: ReceiveArrowSvg, img: ReceiveArrowImg },
} as const;

export type Arrow = keyof typeof ArrowImages;

export default ArrowImages;
