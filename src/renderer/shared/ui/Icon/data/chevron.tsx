/* eslint-disable import-x/max-dependencies */

import CheckedIcon from '@/shared/assets/images/chevron/checked.svg?jsx';
import DownIcon from '@/shared/assets/images/chevron/down.svg?jsx';
import LeftIcon from '@/shared/assets/images/chevron/left.svg?jsx';
import RightIcon from '@/shared/assets/images/chevron/right.svg?jsx';
import SemiCheckedIcon from '@/shared/assets/images/chevron/semiChecked.svg?jsx';
import ShelfDownIcon from '@/shared/assets/images/chevron/shelfDown.svg?jsx';
import ShelfRightIcon from '@/shared/assets/images/chevron/shelfRight.svg?jsx';
import UpIcon from '@/shared/assets/images/chevron/up.svg?jsx';

const ChevronImages = {
  up: { svg: UpIcon },
  right: { svg: RightIcon },
  down: { svg: DownIcon },
  left: { svg: LeftIcon },
  shelfDown: { svg: ShelfDownIcon },
  shelfRight: { svg: ShelfRightIcon },
  checked: { svg: CheckedIcon },
  semiChecked: { svg: SemiCheckedIcon },
} as const;

export type Chevron = keyof typeof ChevronImages;

export default ChevronImages;
