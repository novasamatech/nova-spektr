import ParitySignerBackgroundImg, {
  ReactComponent as ParitySignerBackgroundSvg,
} from '@images/walletTypes/paritySignerBg.svg';
import WatchOnlyBackgroundImg, { ReactComponent as WatchOnlyBackgroundSvg } from '@images/walletTypes/watchOnlyBg.svg';
import ParitySignerImg, { ReactComponent as ParitySignerSvg } from '@images/walletTypes/paritySigner.svg';
import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@images/walletTypes/watchOnly.svg';
import MultisignatureImg, { ReactComponent as MultisignatureSvg } from '@images/walletTypes/multisignature.svg';

const WalletTypeImages = {
  paritySigner: { svg: ParitySignerSvg, img: ParitySignerImg },
  paritySignerBg: { svg: ParitySignerBackgroundSvg, img: ParitySignerBackgroundImg },
  watchOnly: { svg: WatchOnlySvg, img: WatchOnlyImg },
  watchOnlyBg: { svg: WatchOnlyBackgroundSvg, img: WatchOnlyBackgroundImg },
  multisignature: { svg: MultisignatureSvg, img: MultisignatureImg },
} as const;

export type WalletType = keyof typeof WalletTypeImages;

export default WalletTypeImages;
