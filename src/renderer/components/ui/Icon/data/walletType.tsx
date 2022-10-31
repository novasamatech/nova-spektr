import ParitySignerImg, { ReactComponent as ParitySignerSvg } from '@images/walletTypes/paritySigner.svg';
import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@images/walletTypes/watchOnly.svg';
import MultisignatureImg, { ReactComponent as MultisignatureSvg } from '@images/walletTypes/multisignature.svg';

const WalletTypeImages = {
  paritySigner: { svg: ParitySignerSvg, img: ParitySignerImg },
  watchOnly: { svg: WatchOnlySvg, img: WatchOnlyImg },
  multisignature: { svg: MultisignatureSvg, img: MultisignatureImg },
} as const;

export type WalletType = keyof typeof WalletTypeImages;

export default WalletTypeImages;
