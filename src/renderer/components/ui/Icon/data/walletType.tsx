import ParitySignerBgImg, { ReactComponent as ParitySignerBgSvg } from '@images/walletTypes/paritySignerBg.svg';
import WatchOnlyBgImg, { ReactComponent as WatchOnlyBgSvg } from '@images/walletTypes/watchOnlyBg.svg';
import ParitySignerImg, { ReactComponent as ParitySignerSvg } from '@images/walletTypes/paritySigner.svg';
import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@images/walletTypes/watchOnly.svg';
import MultisigBgImg, { ReactComponent as MultisigBgSvg } from '@images/walletTypes/multisigBg.svg';

const WalletTypeImages = {
  paritySigner: { svg: ParitySignerSvg, img: ParitySignerImg },
  paritySignerBg: { svg: ParitySignerBgSvg, img: ParitySignerBgImg },
  watchOnly: { svg: WatchOnlySvg, img: WatchOnlyImg },
  watchOnlyBg: { svg: WatchOnlyBgSvg, img: WatchOnlyBgImg },
  multisigBg: { svg: MultisigBgSvg, img: MultisigBgImg },
} as const;

export type WalletType = keyof typeof WalletTypeImages;

export default WalletTypeImages;
