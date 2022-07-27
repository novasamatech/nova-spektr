import LogoImg, { ReactComponent as LogoSvg } from '@images/misc/logo.svg';

const MiscImages = {
  logo: { svg: LogoSvg, img: LogoImg },
} as const;

export type Misc = keyof typeof MiscImages;

export default MiscImages;
