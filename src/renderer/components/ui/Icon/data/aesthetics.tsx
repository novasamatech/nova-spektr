import LoaderImg, { ReactComponent as LoaderSvg } from '@images/aesthetics/loader.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
