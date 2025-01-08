/* eslint-disable import-x/max-dependencies */

import ChatIcon from '@/shared/assets/images/aesthetics/chat.svg?jsx';
import ClockIcon from '@/shared/assets/images/aesthetics/clock.svg?jsx';
import FellowshipIcon from '@/shared/assets/images/aesthetics/fellowship.svg?jsx';
import FireIcon from '@/shared/assets/images/aesthetics/fire.svg?jsx';
import GlobeIcon from '@/shared/assets/images/aesthetics/globe.svg?jsx';
import HotkeyCtrlIcon from '@/shared/assets/images/aesthetics/hotkey-ctrl.svg?jsx';
import HotkeyOptionIcon from '@/shared/assets/images/aesthetics/hotkey-option.svg?jsx';
import IndividualIcon from '@/shared/assets/images/aesthetics/individual.svg?jsx';
import InfoIcon from '@/shared/assets/images/aesthetics/info.svg?jsx';
import LoaderIcon from '@/shared/assets/images/aesthetics/loader.svg?jsx';
import MembersIcon from '@/shared/assets/images/aesthetics/members.svg?jsx';
import OrganizationIcon from '@/shared/assets/images/aesthetics/organization.svg?jsx';
import PolkadotIcon from '@/shared/assets/images/aesthetics/polkadot.svg?jsx';
import ProfileIcon from '@/shared/assets/images/aesthetics/profile.svg?jsx';
import QuestionIcon from '@/shared/assets/images/aesthetics/question.svg?jsx';
import RocketIcon from '@/shared/assets/images/aesthetics/rocket.svg?jsx';
import StakingIcon from '@/shared/assets/images/aesthetics/staking.svg?jsx';
import TreasuryIcon from '@/shared/assets/images/aesthetics/treasury.svg?jsx';
import VotingIcon from '@/shared/assets/images/aesthetics/voting.svg?jsx';
import WarnIcon from '@/shared/assets/images/aesthetics/warning.svg?jsx';

const AestheticImages = {
  loader: { svg: LoaderIcon },
  fire: { svg: FireIcon },
  clock: { svg: ClockIcon },
  globe: { svg: GlobeIcon },
  info: { svg: InfoIcon },
  warn: { svg: WarnIcon },
  chat: { svg: ChatIcon },
  question: { svg: QuestionIcon },
  hotkeyCtrl: { svg: HotkeyCtrlIcon },
  hotkeyOption: { svg: HotkeyOptionIcon },
  fellowship: { svg: FellowshipIcon },
  polkadot: { svg: PolkadotIcon },
  rocket: { svg: RocketIcon },
  stake: { svg: StakingIcon },
  treasury: { svg: TreasuryIcon },
  voting: { svg: VotingIcon },
  individual: { svg: IndividualIcon },
  organization: { svg: OrganizationIcon },
  members: { svg: MembersIcon },
  profile: { svg: ProfileIcon },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
