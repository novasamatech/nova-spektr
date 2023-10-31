import TransferImg, { ReactComponent as TransferSvg } from '@shared/assets/images/mst/transfer.svg';
import StakingImg, { ReactComponent as StakingSvg } from '@shared/assets/images/mst/staking.svg';
import UnknownImg, { ReactComponent as UnknownSvg } from '@shared/assets/images/mst/unknown.svg';

const MstImages = {
  transferMst: { svg: TransferSvg, img: TransferImg },
  stakingMst: { svg: StakingSvg, img: StakingImg },
  unknownMst: { svg: UnknownSvg, img: UnknownImg },
} as const;

export type Mst = keyof typeof MstImages;

export default MstImages;
