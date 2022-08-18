import PolkascanImg, { ReactComponent as PolkascanSvg } from '@images/explorers/polkascan.svg';
import SubIdImg, { ReactComponent as SubIdSvg } from '@images/explorers/subid.svg';
import SubscanImg, { ReactComponent as SubscanSvg } from '@images/explorers/subscan.svg';
import StatescanImg, { ReactComponent as StatescanSvg } from '@images/explorers/statescan.svg';

const ExplorerImages = {
  Polkascan: { svg: PolkascanSvg, img: PolkascanImg },
  'Sub.ID': { svg: SubIdSvg, img: SubIdImg },
  Subscan: { svg: SubscanSvg, img: SubscanImg },
  Statescan: { svg: StatescanSvg, img: StatescanImg },
} as const;

export type Explorer = keyof typeof ExplorerImages;

export default ExplorerImages;
