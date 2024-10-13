/* eslint-disable import-x/max-dependencies */

import DelegateImg, { ReactComponent as DelegateSvg } from '@/shared/assets/images/functionals/opengov-delegate.svg';
import EditDelegationImg, {
  ReactComponent as EditDelegationSvg,
} from '@/shared/assets/images/functionals/opengov-edit-delegation.svg';
import RetractImg, { ReactComponent as RetractSvg } from '@/shared/assets/images/functionals/opengov-retract.svg';
import RevoteImg, { ReactComponent as RevoteSvg } from '@/shared/assets/images/functionals/opengov-revote.svg';
import UndelegateImg, {
  ReactComponent as UndelegateSvg,
} from '@/shared/assets/images/functionals/opengov-undelegate.svg';
import UnlockImg, { ReactComponent as UnlockSvg } from '@/shared/assets/images/functionals/opengov-unlock.svg';
import VoteImg, { ReactComponent as VoteSvg } from '@/shared/assets/images/functionals/opengov-vote.svg';
import ChangeValidatorsImg, {
  ReactComponent as ChangeValidatorsSvg,
} from '@/shared/assets/images/mst/change-validators-mst.svg';
import DelegatedAuthoritiesImg, {
  ReactComponent as DelegatedAuthoritiesSvg,
} from '@/shared/assets/images/mst/delegated-authorities.svg';
import RedeemImg, { ReactComponent as RedeemSvg } from '@/shared/assets/images/mst/redeem-mst.svg';
import ReturnToStakeImg, {
  ReactComponent as ReturnToStakeSvg,
} from '@/shared/assets/images/mst/return-to-stake-mst.svg';
import DestinationImg, {
  ReactComponent as DestinationSvg,
} from '@/shared/assets/images/mst/rewards-destination-mst.svg';
import StakeMoreImg, { ReactComponent as StakeMoreSvg } from '@/shared/assets/images/mst/stake-more-mst.svg';
import StartStakingImg, { ReactComponent as StartStakingSvg } from '@/shared/assets/images/mst/staking.svg';
import TransferImg, { ReactComponent as TransferSvg } from '@/shared/assets/images/mst/transfer.svg';
import UnknownImg, { ReactComponent as UnknownSvg } from '@/shared/assets/images/mst/unknown.svg';
import UnstakeImg, { ReactComponent as UnstakeSvg } from '@/shared/assets/images/mst/unstake-mst.svg';

const MstImages = {
  transferMst: { svg: TransferSvg, img: TransferImg },
  unknownMst: { svg: UnknownSvg, img: UnknownImg },
  startStakingMst: { svg: StartStakingSvg, img: StartStakingImg },
  redeemMst: { svg: RedeemSvg, img: RedeemImg },
  unstakeMst: { svg: UnstakeSvg, img: UnstakeImg },
  destinationMst: { svg: DestinationSvg, img: DestinationImg },
  stakeMoreMst: { svg: StakeMoreSvg, img: StakeMoreImg },
  changeValidatorsMst: { svg: ChangeValidatorsSvg, img: ChangeValidatorsImg },
  returnToStakeMst: { svg: ReturnToStakeSvg, img: ReturnToStakeImg },
  proxyMst: { svg: DelegatedAuthoritiesSvg, img: DelegatedAuthoritiesImg },
  voteMst: { svg: VoteSvg, img: VoteImg },
  revoteMst: { svg: RevoteSvg, img: RevoteImg },
  retractMst: { svg: RetractSvg, img: RetractImg },
  unlockMst: { svg: UnlockSvg, img: UnlockImg },
  delegateMst: { svg: DelegateSvg, img: DelegateImg },
  undelegateMst: { svg: UndelegateSvg, img: UndelegateImg },
  editDelegationMst: { svg: EditDelegationSvg, img: EditDelegationImg },
} as const;

export type Mst = keyof typeof MstImages;

export default MstImages;
