import AddDelegationImg, { ReactComponent as AddDelegationSvg } from '@shared/assets/images/confirm/add-delegation.svg';
import DestinationImg, {
  ReactComponent as DestinationSvg,
} from '@shared/assets/images/confirm/change-rewards-dest.svg';
import ChangeValidatorsImg, {
  ReactComponent as ChangeValidatorsSvg,
} from '@shared/assets/images/confirm/change-validators.svg';
import CrossChainImg, { ReactComponent as CrossChainSvg } from '@shared/assets/images/confirm/crosschain.svg';
import DelegatedAuthoritiesImg, {
  ReactComponent as DelegatedAuthoritiesSvg,
} from '@shared/assets/images/confirm/delegated-authorities.svg';
import ReturnToStakeImg, {
  ReactComponent as ReturnToStakeSvg,
} from '@shared/assets/images/confirm/return-to-stake.svg';
import StakeMoreImg, { ReactComponent as StakeMoreSvg } from '@shared/assets/images/confirm/stake-more.svg';
import StartStakingImg, { ReactComponent as StartStakingSvg } from '@shared/assets/images/confirm/start-staking.svg';
import TransferImg, { ReactComponent as TransferSvg } from '@shared/assets/images/confirm/transfer.svg';
import UnknownImg, { ReactComponent as UnknownSvg } from '@shared/assets/images/confirm/unknown-operation.svg';
import UnstakeImg, { ReactComponent as UnstakeSvg } from '@shared/assets/images/confirm/unstake.svg';
import RedeemImg, { ReactComponent as RedeemSvg } from '@shared/assets/images/confirm/withdraw-unstake.svg';

const ConfirmImages = {
  transferConfirm: { svg: TransferSvg, img: TransferImg },
  crossChainConfirm: { svg: CrossChainSvg, img: CrossChainImg },
  unknownConfirm: { svg: UnknownSvg, img: UnknownImg },
  startStakingConfirm: { svg: StartStakingSvg, img: StartStakingImg },
  redeemConfirm: { svg: RedeemSvg, img: RedeemImg },
  unstakeConfirm: { svg: UnstakeSvg, img: UnstakeImg },
  destinationConfirm: { svg: DestinationSvg, img: DestinationImg },
  stakeMoreConfirm: { svg: StakeMoreSvg, img: StakeMoreImg },
  changeValidatorsConfirm: { svg: ChangeValidatorsSvg, img: ChangeValidatorsImg },
  returnToStakeConfirm: { svg: ReturnToStakeSvg, img: ReturnToStakeImg },
  proxyConfirm: { svg: DelegatedAuthoritiesSvg, img: DelegatedAuthoritiesImg },
  addDelegationConfirm: { svg: AddDelegationSvg, img: AddDelegationImg },
} as const;

export type Confirm = keyof typeof ConfirmImages;

export default ConfirmImages;
