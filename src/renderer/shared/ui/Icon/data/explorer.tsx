/* eslint-disable import-x/max-dependencies */

import DefaultIcon from '@/shared/assets/images/explorers/default.svg?jsx';
import MoonscanIcon from '@/shared/assets/images/explorers/moonscan.svg?jsx';
import PolkascanIcon from '@/shared/assets/images/explorers/polkascan.svg?jsx';
import PolkassemblyIcon from '@/shared/assets/images/explorers/polkassembly.svg?jsx';
import StatescanIcon from '@/shared/assets/images/explorers/statescan.svg?jsx';
import SubIdIcon from '@/shared/assets/images/explorers/subid.svg?jsx';
import SubscanIcon from '@/shared/assets/images/explorers/subscan.svg?jsx';
import SubsquareIcon from '@/shared/assets/images/explorers/subsquare.svg?jsx';
import TernoaIcon from '@/shared/assets/images/explorers/ternoa.svg?jsx';

const ExplorerImages = {
  defaultExplorer: { svg: DefaultIcon },
  polkascan: { svg: PolkascanIcon },
  subid: { svg: SubIdIcon },
  subscan: { svg: SubscanIcon },
  statescan: { svg: StatescanIcon },
  ternoa: { svg: TernoaIcon },
  moonscan: { svg: MoonscanIcon },
  polkassembly: { svg: PolkassemblyIcon },
  subsquare: { svg: SubsquareIcon },
} as const;

export type Explorer = keyof typeof ExplorerImages;

export default ExplorerImages;
