import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@images/walletTypesNew/watchOnly.svg';
import MultisigImg, { ReactComponent as MultisigSvg } from '@images/walletTypesNew/multisig.svg';
import VaultImg, { ReactComponent as VaultSvg } from '@images/walletTypesNew/vault.svg';
import WalletConnectImg, { ReactComponent as WalletConnectSvg } from '@images/walletTypesNew/walletConnect.svg';

const WalletTypeImagesNew = {
  watchOnlyNew: { svg: WatchOnlySvg, img: WatchOnlyImg },
  multisigNew: { svg: MultisigSvg, img: MultisigImg },
  vaultNew: { svg: VaultSvg, img: VaultImg },
  walletConnectNew: { img: WalletConnectImg, svg: WalletConnectSvg },
} as const;

export type WalletTypeNew = keyof typeof WalletTypeImagesNew;

export default WalletTypeImagesNew;
