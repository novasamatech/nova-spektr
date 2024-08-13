import DefaultImg, { ReactComponent as DefaultSvg } from '@shared/assets/images/explorers/default.svg';
import MoonscanImg, { ReactComponent as MoonscanSvg } from '@shared/assets/images/explorers/moonscan.svg';
import PolkaholicImg from '@shared/assets/images/explorers/polkaholic.webp';
import PolkascanImg, { ReactComponent as PolkascanSvg } from '@shared/assets/images/explorers/polkascan.svg';
import PolkassemblyImg, { ReactComponent as PolkassemblySvg } from '@shared/assets/images/explorers/polkassembly.svg';
import StatescanImg, { ReactComponent as StatescanSvg } from '@shared/assets/images/explorers/statescan.svg';
import SubIdImg, { ReactComponent as SubIdSvg } from '@shared/assets/images/explorers/subid.svg';
import SubscanImg, { ReactComponent as SubscanSvg } from '@shared/assets/images/explorers/subscan.svg';
import SubsquareImg, { ReactComponent as SubsquareSvg } from '@shared/assets/images/explorers/subsquare.svg';
import TernoaImg, { ReactComponent as TernoaSvg } from '@shared/assets/images/explorers/ternoa.svg';

const ExplorerImages = {
  defaultExplorer: { svg: DefaultSvg, img: DefaultImg },
  polkascan: { svg: PolkascanSvg, img: PolkascanImg },
  subid: { svg: SubIdSvg, img: SubIdImg },
  subscan: { svg: SubscanSvg, img: SubscanImg },
  statescan: { svg: StatescanSvg, img: StatescanImg },
  ternoa: { svg: TernoaSvg, img: TernoaImg },
  polkaholic: { svg: null, img: PolkaholicImg },
  moonscan: { svg: MoonscanSvg, img: MoonscanImg },
  polkassembly: { svg: PolkassemblySvg, img: PolkassemblyImg },
  subsquare: { svg: SubsquareSvg, img: SubsquareImg },
} as const;

export type Explorer = keyof typeof ExplorerImages;

export default ExplorerImages;
