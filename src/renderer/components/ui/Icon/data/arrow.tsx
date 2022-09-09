import ArrowUpImg, { ReactComponent as ArrowUpSvg } from '@images/arrows/up.svg';
import ArrowDownImg, { ReactComponent as ArrowDownSvg } from '@images/arrows/down.svg';

const ArrowImages = {
  arrowUp: { svg: ArrowUpSvg, img: ArrowUpImg },
  arrowDown: { svg: ArrowDownSvg, img: ArrowDownImg },
} as const;

export type Arrow = keyof typeof ArrowImages;

export default ArrowImages;
