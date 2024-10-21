/* eslint-disable import-x/max-dependencies */

import CheckedImg, { ReactComponent as CheckedSvg } from '@/shared/assets/images/chevron/checked.svg';
import DownImg, { ReactComponent as DownSvg } from '@/shared/assets/images/chevron/down.svg';
import LeftImg, { ReactComponent as LeftSvg } from '@/shared/assets/images/chevron/left.svg';
import RightImg, { ReactComponent as RightSvg } from '@/shared/assets/images/chevron/right.svg';
import SemiCheckedImg, { ReactComponent as SemiCheckedSvg } from '@/shared/assets/images/chevron/semiChecked.svg';
import ShelfDownImg, { ReactComponent as ShelfDownSvg } from '@/shared/assets/images/chevron/shelfDown.svg';
import ShelfRightImg, { ReactComponent as ShelfRightSvg } from '@/shared/assets/images/chevron/shelfRight.svg';
import UpImg, { ReactComponent as UpSvg } from '@/shared/assets/images/chevron/up.svg';

const ChevronImages = {
  up: { svg: UpSvg, img: UpImg },
  right: { svg: RightSvg, img: RightImg },
  down: { svg: DownSvg, img: DownImg },
  left: { svg: LeftSvg, img: LeftImg },
  shelfDown: { svg: ShelfDownSvg, img: ShelfDownImg },
  shelfRight: { svg: ShelfRightSvg, img: ShelfRightImg },
  checked: { svg: CheckedSvg, img: CheckedImg },
  semiChecked: { svg: SemiCheckedSvg, img: SemiCheckedImg },
} as const;

export type Chevron = keyof typeof ChevronImages;

export default ChevronImages;
