import LoaderImg, { ReactComponent as LoaderSvg } from '@images/aesthetics/loader.svg';
import ShieldImg, { ReactComponent as ShieldSvg } from '@images/aesthetics/shield.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
  shield: { svg: ShieldSvg, img: ShieldImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
