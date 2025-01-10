import AddDelegationIcon from '@/shared/assets/images/confirm/add-delegation.svg?jsx';
import DestinationIcon from '@/shared/assets/images/confirm/change-rewards-dest.svg?jsx';
import ChangeValidatorsIcon from '@/shared/assets/images/confirm/change-validators.svg?jsx';
import CrossChainIcon from '@/shared/assets/images/confirm/crosschain.svg?jsx';
import DelegatedAuthoritiesIcon from '@/shared/assets/images/confirm/delegated-authorities.svg?jsx';
import EditDelegationIcon from '@/shared/assets/images/confirm/edit-delegation.svg?jsx';
import MultisigCreationIcon from '@/shared/assets/images/confirm/multisig-creation.svg?jsx';
import ReturnToStakeIcon from '@/shared/assets/images/confirm/return-to-stake.svg?jsx';
import RevokeDelegationIcon from '@/shared/assets/images/confirm/revoke-delegation.svg?jsx';
import StakeMoreIcon from '@/shared/assets/images/confirm/stake-more.svg?jsx';
import StartStakingIcon from '@/shared/assets/images/confirm/start-staking.svg?jsx';
import TransferIcon from '@/shared/assets/images/confirm/transfer.svg?jsx';
import UnknownIcon from '@/shared/assets/images/confirm/unknown-operation.svg?jsx';
import UnstakeIcon from '@/shared/assets/images/confirm/unstake.svg?jsx';
import RedeemIcon from '@/shared/assets/images/confirm/withdraw-unstake.svg?jsx';

const ConfirmImages = {
  transferConfirm: { svg: TransferIcon },
  crossChainConfirm: { svg: CrossChainIcon },
  unknownConfirm: { svg: UnknownIcon },
  startStakingConfirm: { svg: StartStakingIcon },
  redeemConfirm: { svg: RedeemIcon },
  unstakeConfirm: { svg: UnstakeIcon },
  destinationConfirm: { svg: DestinationIcon },
  stakeMoreConfirm: { svg: StakeMoreIcon },
  changeValidatorsConfirm: { svg: ChangeValidatorsIcon },
  returnToStakeConfirm: { svg: ReturnToStakeIcon },
  proxyConfirm: { svg: DelegatedAuthoritiesIcon },
  addDelegationConfirm: { svg: AddDelegationIcon },
  editDelegationConfirm: { svg: EditDelegationIcon },
  revokeDelegationConfirm: { svg: RevokeDelegationIcon },
  multisigCreationConfirm: { svg: MultisigCreationIcon },
} as const;

export type Confirm = keyof typeof ConfirmImages;

export default ConfirmImages;
