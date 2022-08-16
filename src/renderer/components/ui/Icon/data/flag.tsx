import EnImg, { ReactComponent as EnSvg } from '@images/flags/en.svg';
import RuImg, { ReactComponent as RuSvg } from '@images/flags/ru.svg';
import HuImg, { ReactComponent as HuSvg } from '@images/flags/hu.svg';

const FlagImages = {
  en: { svg: EnSvg, img: EnImg },
  ru: { svg: RuSvg, img: RuImg },
  hu: { svg: HuSvg, img: HuImg },
} as const;

export type Flag = keyof typeof FlagImages;

export default FlagImages;
