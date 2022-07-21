import UpImg, { ReactComponent as UpSvg } from '@images/chevron/up.svg';
import RightImg, { ReactComponent as RightSvg } from '@images/chevron/right.svg';
import DownImg, { ReactComponent as DownSvg } from '@images/chevron/down.svg';
import LeftImg, { ReactComponent as LeftSvg } from '@images/chevron/left.svg';

const ChevronImages = {
  up: { svg: UpSvg, img: UpImg },
  right: { svg: RightSvg, img: RightImg },
  down: { svg: DownSvg, img: DownImg },
  left: { svg: LeftSvg, img: LeftImg },
} as const;

export type Chevron = keyof typeof ChevronImages;

export default ChevronImages;
