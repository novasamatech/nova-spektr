import ArrowUpImg, { ReactComponent as ArrowUpSvg } from '@images/arrows/up.svg';
import ArrowDownImg, { ReactComponent as ArrowDownSvg } from '@images/arrows/down.svg';
import ArrowLeftImg, { ReactComponent as ArrowLeftSvg } from '@images/arrows/left.svg';
import ArrowRightImg, { ReactComponent as ArrowRightSvg } from '@images/arrows/right.svg';
import ArrowLeftCutoutImg, { ReactComponent as ArrowLeftCutoutSvg } from '@images/arrows/left-cutout.svg';
import SendArrowImg, { ReactComponent as SendArrowSvg } from '@images/arrows/send-arrow.svg';
import ReceiveArrowImg, { ReactComponent as ReceiveArrowSvg } from '@images/arrows/receive-arrow.svg';
import CurveArrowImg, { ReactComponent as CurveArrowSvg } from '@images/arrows/arrow-curve-left-right.svg';
import SwapArrowImg, { ReactComponent as SwapArrowSvg } from '@images/arrows/swap-arrow.svg';
import CrossChainImg, { ReactComponent as CrossChainSvg } from '@images/arrows/cross-chain-arrow.svg';

const ArrowImages = {
  arrowUp: { svg: ArrowUpSvg, img: ArrowUpImg },
  arrowDown: { svg: ArrowDownSvg, img: ArrowDownImg },
  arrowLeftCutout: { svg: ArrowLeftCutoutSvg, img: ArrowLeftCutoutImg },
  arrowLeft: { svg: ArrowLeftSvg, img: ArrowLeftImg },
  arrowRight: { svg: ArrowRightSvg, img: ArrowRightImg },
  sendArrow: { svg: SendArrowSvg, img: SendArrowImg },
  receiveArrow: { svg: ReceiveArrowSvg, img: ReceiveArrowImg },
  curveArrow: { svg: CurveArrowSvg, img: CurveArrowImg },
  swapArrow: { svg: SwapArrowSvg, img: SwapArrowImg },
  crossChain: { svg: CrossChainSvg, img: CrossChainImg },
} as const;

export type Arrow = keyof typeof ArrowImages;

export default ArrowImages;
