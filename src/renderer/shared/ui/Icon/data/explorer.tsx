import DefaultImg, { ReactComponent as DefaultSvg } from '@shared/assets/images/explorers/default.svg';
import PolkascanImg, { ReactComponent as PolkascanSvg } from '@shared/assets/images/explorers/polkascan.svg';
import SubIdImg, { ReactComponent as SubIdSvg } from '@shared/assets/images/explorers/subid.svg';
import SubscanImg, { ReactComponent as SubscanSvg } from '@shared/assets/images/explorers/subscan.svg';
import StatescanImg, { ReactComponent as StatescanSvg } from '@shared/assets/images/explorers/statescan.svg';
import TernoaImg, { ReactComponent as TernoaSvg } from '@shared/assets/images/explorers/ternoa.svg';
import MoonscanImg, { ReactComponent as MoonscanSvg } from '@shared/assets/images/explorers/moonscan.svg';
import PolkaholicImg from '@shared/assets/images/explorers/polkaholic.webp';

const ExplorerImages = {
  defaultExplorer: { svg: DefaultSvg, img: DefaultImg },
  polkascan: { svg: PolkascanSvg, img: PolkascanImg },
  subid: { svg: SubIdSvg, img: SubIdImg },
  subscan: { svg: SubscanSvg, img: SubscanImg },
  statescan: { svg: StatescanSvg, img: StatescanImg },
  ternoa: { svg: TernoaSvg, img: TernoaImg },
  polkaholic: { svg: null, img: PolkaholicImg },
  moonscan: { svg: MoonscanSvg, img: MoonscanImg },
} as const;

export type Explorer = keyof typeof ExplorerImages;

export default ExplorerImages;
