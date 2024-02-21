import TransferImg, { ReactComponent as TransferSvg } from '@shared/assets/images/mst/transfer.svg';
import UnknownImg, { ReactComponent as UnknownSvg } from '@shared/assets/images/mst/unknown.svg';
import RedeemImg, { ReactComponent as RedeemSvg } from '@shared/assets/images/mst/redeem-mst.svg';
import UnstakeImg, { ReactComponent as UnstakeSvg } from '@shared/assets/images/mst/unstake-mst.svg';
import DestinationImg, {
  ReactComponent as DestinationSvg,
} from '@shared/assets/images/mst/rewards-destination-mst.svg';
import StakeMoreImg, { ReactComponent as StakeMoreSvg } from '@shared/assets/images/mst/stake-more-mst.svg';
import StartStakingImg, { ReactComponent as StartStakingSvg } from '@shared/assets/images/mst/staking.svg';
import ChangeValidatorsImg, {
  ReactComponent as ChangeValidatorsSvg,
} from '@shared/assets/images/mst/change-validators-mst.svg';
import ReturnToStakeImg, {
  ReactComponent as ReturnToStakeSvg,
} from '@shared/assets/images/mst/return-to-stake-mst.svg';
import DelegatedAuthoritiesImg, {
  ReactComponent as DelegatedAuthoritiesSvg,
} from '@shared/assets/images/mst/delegated-authorities.svg';

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
} as const;

export type Mst = keyof typeof MstImages;

export default MstImages;
