import ChangeValidatorsImg, {
  ReactComponent as ChangeValidatorsSvg,
} from '@shared/assets/images/staking/change-validators.svg';
import RedeemImg, { ReactComponent as RedeemSvg } from '@shared/assets/images/staking/redeem.svg';
import ReturnToStakeImg, {
  ReactComponent as ReturnToStakeSvg,
} from '@shared/assets/images/staking/return-to-stake.svg';
import DestinationImg, {
  ReactComponent as DestinationSvg,
} from '@shared/assets/images/staking/rewards-destination.svg';
import SetValidatorsImg, { ReactComponent as SetValidatorsSvg } from '@shared/assets/images/staking/set-validators.svg';
import StakeMoreImg, { ReactComponent as StakeMoreSvg } from '@shared/assets/images/staking/stake-more.svg';
import StartStakingImg, { ReactComponent as StartStakingSvg } from '@shared/assets/images/staking/start-staking.svg';
import UnstakeImg, { ReactComponent as UnstakeSvg } from '@shared/assets/images/staking/unstake.svg';

const StakingImages = {
  redeem: { svg: RedeemSvg, img: RedeemImg },
  changeValidators: { svg: ChangeValidatorsSvg, img: ChangeValidatorsImg },
  setValidators: { svg: SetValidatorsSvg, img: SetValidatorsImg },
  returnToStake: { svg: ReturnToStakeSvg, img: ReturnToStakeImg },
  unstake: { svg: UnstakeSvg, img: UnstakeImg },
  destination: { svg: DestinationSvg, img: DestinationImg },
  stakeMore: { svg: StakeMoreSvg, img: StakeMoreImg },
  startStaking: { svg: StartStakingSvg, img: StartStakingImg },
} as const;

export type Staking = keyof typeof StakingImages;

export default StakingImages;
