/* eslint-disable import-x/max-dependencies */

import ChangeValidatorsIcon from '@/shared/assets/images/staking/change-validators.svg?jsx';
import RedeemIcon from '@/shared/assets/images/staking/redeem.svg?jsx';
import ReturnToStakeIcon from '@/shared/assets/images/staking/return-to-stake.svg?jsx';
import DestinationIcon from '@/shared/assets/images/staking/rewards-destination.svg?jsx';
import SetValidatorsIcon from '@/shared/assets/images/staking/set-validators.svg?jsx';
import StakeMoreIcon from '@/shared/assets/images/staking/stake-more.svg?jsx';
import StartStakingIcon from '@/shared/assets/images/staking/start-staking.svg?jsx';
import UnstakeIcon from '@/shared/assets/images/staking/unstake.svg?jsx';

const StakingImages = {
  redeem: { svg: RedeemIcon },
  changeValidators: { svg: ChangeValidatorsIcon },
  setValidators: { svg: SetValidatorsIcon },
  returnToStake: { svg: ReturnToStakeIcon },
  unstake: { svg: UnstakeIcon },
  destination: { svg: DestinationIcon },
  stakeMore: { svg: StakeMoreIcon },
  startStaking: { svg: StartStakingIcon },
} as const;

export type Staking = keyof typeof StakingImages;

export default StakingImages;
