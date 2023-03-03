import DefaultImg, { ReactComponent as DefaultSvg } from '@images/explorers/default.svg';
import PolkascanImg, { ReactComponent as PolkascanSvg } from '@images/explorers/polkascan.svg';
import SubIdImg, { ReactComponent as SubIdSvg } from '@images/explorers/subid.svg';
import SubscanImg, { ReactComponent as SubscanSvg } from '@images/explorers/subscan.svg';
import StatescanImg, { ReactComponent as StatescanSvg } from '@images/explorers/statescan.svg';
import PolkaholicImg from '@images/explorers/polkaholic.webp';
import TernoaImg from '@images/explorers/ternoa.png';

const ExplorerImages = {
  defaultExplorer: { svg: DefaultSvg, img: DefaultImg },
  polkascan: { svg: PolkascanSvg, img: PolkascanImg },
  subid: { svg: SubIdSvg, img: SubIdImg },
  subscan: { svg: SubscanSvg, img: SubscanImg },
  statescan: { svg: StatescanSvg, img: StatescanImg },
  polkaholic: { svg: null, img: PolkaholicImg },
  ternoa: { svg: null, img: TernoaImg },
} as const;

export type Explorer = keyof typeof ExplorerImages;

export default ExplorerImages;
