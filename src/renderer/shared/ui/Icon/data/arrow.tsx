/* eslint-disable import-x/max-dependencies */

import CrossChainIcon from '@/shared/assets/images/arrows/cross-chain-arrow.svg?jsx';
import ArrowCurveLeftRightIcon from '@/shared/assets/images/arrows/curve-left-right.svg?jsx';
import arrowDoubleDownIcon from '@/shared/assets/images/arrows/double-down.svg?jsx';
import arrowDoubleUpIcon from '@/shared/assets/images/arrows/double-up.svg?jsx';
import ArrowLeftIcon from '@/shared/assets/images/arrows/left.svg?jsx';
import ReceiveArrowIcon from '@/shared/assets/images/arrows/receive-arrow.svg?jsx';
import ArrowRightIcon from '@/shared/assets/images/arrows/right.svg?jsx';
import SendArrowIcon from '@/shared/assets/images/arrows/send-arrow.svg?jsx';
import SwapArrowIcon from '@/shared/assets/images/arrows/swap-arrow.svg?jsx';

const ArrowImages = {
  arrowLeft: { svg: ArrowLeftIcon },
  arrowRight: { svg: ArrowRightIcon },
  sendArrow: { svg: SendArrowIcon },
  receiveArrow: { svg: ReceiveArrowIcon },
  swapArrow: { svg: SwapArrowIcon },
  crossChain: { svg: CrossChainIcon },
  arrowCurveLeftRight: { svg: ArrowCurveLeftRightIcon },
  arrowDoubleDown: { svg: arrowDoubleDownIcon },
  arrowDoubleUp: { svg: arrowDoubleUpIcon },
} as const;

export type Arrow = keyof typeof ArrowImages;

export default ArrowImages;
