import ArrowLeftImg, { ReactComponent as ArrowLeftSvg } from '@shared/assets/images/arrows/left.svg';
import ArrowRightImg, { ReactComponent as ArrowRightSvg } from '@shared/assets/images/arrows/right.svg';
import SendArrowImg, { ReactComponent as SendArrowSvg } from '@shared/assets/images/arrows/send-arrow.svg';
import ReceiveArrowImg, { ReactComponent as ReceiveArrowSvg } from '@shared/assets/images/arrows/receive-arrow.svg';
import SwapArrowImg, { ReactComponent as SwapArrowSvg } from '@shared/assets/images/arrows/swap-arrow.svg';
import CrossChainImg, { ReactComponent as CrossChainSvg } from '@shared/assets/images/arrows/cross-chain-arrow.svg';
import ArrowCurveLeftRightImg, {
  ReactComponent as ArrowCurveLeftRightSvg,
} from '@shared/assets/images/arrows/curve-left-right.svg';

const ArrowImages = {
  arrowLeft: { svg: ArrowLeftSvg, img: ArrowLeftImg },
  arrowRight: { svg: ArrowRightSvg, img: ArrowRightImg },
  sendArrow: { svg: SendArrowSvg, img: SendArrowImg },
  receiveArrow: { svg: ReceiveArrowSvg, img: ReceiveArrowImg },
  swapArrow: { svg: SwapArrowSvg, img: SwapArrowImg },
  crossChain: { svg: CrossChainSvg, img: CrossChainImg },
  arrowCurveLeftRight: { svg: ArrowCurveLeftRightSvg, img: ArrowCurveLeftRightImg },
} as const;

export type Arrow = keyof typeof ArrowImages;

export default ArrowImages;
