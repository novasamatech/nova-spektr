/* eslint-disable import-x/max-dependencies */

import DelegateIcon from '@/shared/assets/images/functionals/opengov-delegate.svg?jsx';
import EditDelegationIcon from '@/shared/assets/images/functionals/opengov-edit-delegation.svg?jsx';
import RetractIcon from '@/shared/assets/images/functionals/opengov-retract.svg?jsx';
import RevoteIcon from '@/shared/assets/images/functionals/opengov-revote.svg?jsx';
import UndelegateIcon from '@/shared/assets/images/functionals/opengov-undelegate.svg?jsx';
import UnlockIcon from '@/shared/assets/images/functionals/opengov-unlock.svg?jsx';
import VoteIcon from '@/shared/assets/images/functionals/opengov-vote.svg?jsx';
import ChangeValidatorsIcon from '@/shared/assets/images/mst/change-validators-mst.svg?jsx';
import DelegatedAuthoritiesIcon from '@/shared/assets/images/mst/delegated-authorities.svg?jsx';
import RedeemIcon from '@/shared/assets/images/mst/redeem-mst.svg?jsx';
import ReturnToStakeIcon from '@/shared/assets/images/mst/return-to-stake-mst.svg?jsx';
import DestinationIcon from '@/shared/assets/images/mst/rewards-destination-mst.svg?jsx';
import StakeMoreIcon from '@/shared/assets/images/mst/stake-more-mst.svg?jsx';
import StartStakingIcon from '@/shared/assets/images/mst/staking.svg?jsx';
import TransferIcon from '@/shared/assets/images/mst/transfer.svg?jsx';
import UnknownIcon from '@/shared/assets/images/mst/unknown.svg?jsx';
import UnstakeIcon from '@/shared/assets/images/mst/unstake-mst.svg?jsx';

const MstImages = {
  transferMst: { svg: TransferIcon },
  unknownMst: { svg: UnknownIcon },
  startStakingMst: { svg: StartStakingIcon },
  redeemMst: { svg: RedeemIcon },
  unstakeMst: { svg: UnstakeIcon },
  destinationMst: { svg: DestinationIcon },
  stakeMoreMst: { svg: StakeMoreIcon },
  changeValidatorsMst: { svg: ChangeValidatorsIcon },
  returnToStakeMst: { svg: ReturnToStakeIcon },
  proxyMst: { svg: DelegatedAuthoritiesIcon },
  voteMst: { svg: VoteIcon },
  revoteMst: { svg: RevoteIcon },
  retractMst: { svg: RetractIcon },
  unlockMst: { svg: UnlockIcon },
  delegateMst: { svg: DelegateIcon },
  undelegateMst: { svg: UndelegateIcon },
  editDelegationMst: { svg: EditDelegationIcon },
} as const;

export type Mst = keyof typeof MstImages;

export default MstImages;
