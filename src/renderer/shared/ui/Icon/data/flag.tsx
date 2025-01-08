/* eslint-disable import-x/max-dependencies */

import EnIcon from '@/shared/assets/images/flags/en.svg?jsx';
import HuIcon from '@/shared/assets/images/flags/hu.svg?jsx';
import RuIcon from '@/shared/assets/images/flags/ru.svg?jsx';

const FlagImages = {
  en: { svg: EnIcon },
  ru: { svg: RuIcon },
  hu: { svg: HuIcon },
} as const;

export type Flag = keyof typeof FlagImages;

export default FlagImages;
