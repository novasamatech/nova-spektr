/* eslint-disable import-x/max-dependencies */

import ChatImg, { ReactComponent as ChatSvg } from '@/shared/assets/images/aesthetics/chat.svg';
import ClockImg, { ReactComponent as ClockSvg } from '@/shared/assets/images/aesthetics/clock.svg';
import FellowshipImg, { ReactComponent as FellowshipSvg } from '@/shared/assets/images/aesthetics/fellowship.svg';
import FireImg, { ReactComponent as FireSvg } from '@/shared/assets/images/aesthetics/fire.svg';
import GlobeImg, { ReactComponent as GlobeSvg } from '@/shared/assets/images/aesthetics/globe.svg';
import HotkeyCtrlImg, { ReactComponent as HotkeyCtrlSvg } from '@/shared/assets/images/aesthetics/hotkey-ctrl.svg';
import HotkeyOptionImg, {
  ReactComponent as HotkeyOptionSvg,
} from '@/shared/assets/images/aesthetics/hotkey-option.svg';
import IndividualImg, { ReactComponent as IndividualSvg } from '@/shared/assets/images/aesthetics/individual.svg';
import InfoImg, { ReactComponent as InfoSvg } from '@/shared/assets/images/aesthetics/info.svg';
import LoaderImg, { ReactComponent as LoaderSvg } from '@/shared/assets/images/aesthetics/loader.svg';
import MembersImg, { ReactComponent as MembersSvg } from '@/shared/assets/images/aesthetics/members.svg';
import OrganizationImg, { ReactComponent as OrganizationSvg } from '@/shared/assets/images/aesthetics/organization.svg';
import PolkadotImg, { ReactComponent as PolkadotSvg } from '@/shared/assets/images/aesthetics/polkadot.svg';
import ProfileImg, { ReactComponent as ProfileSvg } from '@/shared/assets/images/aesthetics/profile.svg';
import QuestionImg, { ReactComponent as QuestionSvg } from '@/shared/assets/images/aesthetics/question.svg';
import RocketImg, { ReactComponent as RocketSvg } from '@/shared/assets/images/aesthetics/rocket.svg';
import StakingImg, { ReactComponent as StakingSvg } from '@/shared/assets/images/aesthetics/staking.svg';
import TreasuryImg, { ReactComponent as TreasurySvg } from '@/shared/assets/images/aesthetics/treasury.svg';
import VotingImg, { ReactComponent as VotingSvg } from '@/shared/assets/images/aesthetics/voting.svg';
import WarnImg, { ReactComponent as WarnSvg } from '@/shared/assets/images/aesthetics/warning.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
  fire: { svg: FireSvg, img: FireImg },
  clock: { svg: ClockSvg, img: ClockImg },
  globe: { svg: GlobeSvg, img: GlobeImg },
  info: { svg: InfoSvg, img: InfoImg },
  warn: { svg: WarnSvg, img: WarnImg },
  chat: { svg: ChatSvg, img: ChatImg },
  question: { svg: QuestionSvg, img: QuestionImg },
  hotkeyCtrl: { svg: HotkeyCtrlSvg, img: HotkeyCtrlImg },
  hotkeyOption: { svg: HotkeyOptionSvg, img: HotkeyOptionImg },
  fellowship: { svg: FellowshipSvg, img: FellowshipImg },
  polkadot: { svg: PolkadotSvg, img: PolkadotImg },
  rocket: { svg: RocketSvg, img: RocketImg },
  stake: { svg: StakingSvg, img: StakingImg },
  treasury: { svg: TreasurySvg, img: TreasuryImg },
  voting: { svg: VotingSvg, img: VotingImg },
  individual: { svg: IndividualSvg, img: IndividualImg },
  organization: { svg: OrganizationSvg, img: OrganizationImg },
  members: { svg: MembersSvg, img: MembersImg },
  profile: { svg: ProfileSvg, img: ProfileImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
