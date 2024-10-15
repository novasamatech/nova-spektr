/* eslint-disable import-x/max-dependencies */

import EnImg, { ReactComponent as EnSvg } from '@/shared/assets/images/flags/en.svg';
import HuImg, { ReactComponent as HuSvg } from '@/shared/assets/images/flags/hu.svg';
import RuImg, { ReactComponent as RuSvg } from '@/shared/assets/images/flags/ru.svg';

const FlagImages = {
  en: { svg: EnSvg, img: EnImg },
  ru: { svg: RuSvg, img: RuImg },
  hu: { svg: HuSvg, img: HuImg },
} as const;

export type Flag = keyof typeof FlagImages;

export default FlagImages;
