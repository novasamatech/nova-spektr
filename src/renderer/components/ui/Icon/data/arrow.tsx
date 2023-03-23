import ArrowUpImg, { ReactComponent as ArrowUpSvg } from '@images/arrows/up.svg';
import ArrowDownImg, { ReactComponent as ArrowDownSvg } from '@images/arrows/down.svg';
import ArrowLeftImg, { ReactComponent as ArrowLeftSvg } from '@images/arrows/left.svg';
import ArrowLeftCutoutImg, { ReactComponent as ArrowLeftCutoutSvg } from '@images/arrows/left-cutout.svg';

const ArrowImages = {
  arrowUp: { svg: ArrowUpSvg, img: ArrowUpImg },
  arrowDown: { svg: ArrowDownSvg, img: ArrowDownImg },
  arrowLeftCutout: { svg: ArrowLeftCutoutSvg, img: ArrowLeftCutoutImg },
  arrowLeft: { svg: ArrowLeftSvg, img: ArrowLeftImg },
} as const;

export type Arrow = keyof typeof ArrowImages;

export default ArrowImages;
