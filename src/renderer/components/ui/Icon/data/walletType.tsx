import ParitySignerBgImg, { ReactComponent as ParitySignerBgSvg } from '@images/walletTypes/paritySignerBg.svg';
import WatchOnlyBgImg, { ReactComponent as WatchOnlyBgSvg } from '@images/walletTypes/watchOnlyBg.svg';
import ParitySignerImg, { ReactComponent as ParitySignerSvg } from '@images/walletTypes/paritySigner.svg';
import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@images/walletTypes/watchOnly.svg';
import MultisigBgImg, { ReactComponent as MultisigBgSvg } from '@images/walletTypes/multisigBg.svg';
import MultisigImg, { ReactComponent as MultisigSvg } from '@images/walletTypes/multisig.svg';
import VaultImg, { ReactComponent as VaultSvg } from '@images/walletTypes/vault.svg';
import MultishardImg, { ReactComponent as MultishardSvg } from '@images/walletTypes/multishard.svg';

const WalletTypeImages = {
  paritySigner: { svg: ParitySignerSvg, img: ParitySignerImg },
  paritySignerBg: { svg: ParitySignerBgSvg, img: ParitySignerBgImg },
  watchOnly: { svg: WatchOnlySvg, img: WatchOnlyImg },
  watchOnlyBg: { svg: WatchOnlyBgSvg, img: WatchOnlyBgImg },
  multisigBg: { svg: MultisigBgSvg, img: MultisigBgImg },
  multisig: { svg: MultisigSvg, img: MultisigImg },
  vault: { svg: VaultSvg, img: VaultImg },
  multishard: { svg: MultishardSvg, img: MultishardImg },
} as const;

export type WalletImagesUnion = keyof typeof WalletTypeImages;

export default WalletTypeImages;
