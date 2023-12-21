import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@shared/assets/images/walletTypes/watchOnly.svg';
import WatchOnlyOnboardingImg, {
  ReactComponent as WatchOnlyOnboardingSvg,
} from '@shared/assets/images/walletTypes/watchOnlyOnboardiing.svg';
import MultisigImg, { ReactComponent as MultisigSvg } from '@shared/assets/images/walletTypes/multisig.svg';
import VaultImg, { ReactComponent as VaultSvg } from '@shared/assets/images/walletTypes/vault.svg';
import VaultOnboardingImg, {
  ReactComponent as VaultOnboardingSvg,
} from '@shared/assets/images/walletTypes/vaultOnboarding.svg';
import NovaWalletImg, { ReactComponent as NovaWalletSvg } from '@shared/assets/images/walletTypes/novaWallet.svg';
import LedgerOnboardingImg, {
  ReactComponent as LedgerOnboardingSvg,
} from '@shared/assets/images/walletTypes/ledgerOnboarding.svg';
import WalletConnectImg, {
  ReactComponent as WalletConnectSvg,
} from '@shared/assets/images/walletTypes/walletConnect.svg';
import WalletConnectOnboardingImg, {
  ReactComponent as WalletConnectOnboardingSvg,
} from '@shared/assets/images/walletTypes/walletConnectOnboarding.svg';
import NovaWalletOnboardingImg, {
  ReactComponent as NovaWalletOnboardingSvg,
} from '@shared/assets/images/walletTypes/novaWalletOnboarding.svg';

// TODO: Remove old wallet images after left menu styles updated
const WalletTypeImages = {
  watchOnly: { svg: WatchOnlySvg, img: WatchOnlyImg },
  watchOnlyOnboarding: { svg: WatchOnlyOnboardingSvg, img: WatchOnlyOnboardingImg },
  multisig: { svg: MultisigSvg, img: MultisigImg },
  vault: { svg: VaultSvg, img: VaultImg },
  vaultOnboarding: { svg: VaultOnboardingSvg, img: VaultOnboardingImg },
  novaWallet: { img: NovaWalletImg, svg: NovaWalletSvg },
  novaWalletOnboarding: { img: NovaWalletOnboardingImg, svg: NovaWalletOnboardingSvg },
  ledgerOnboarding: { img: LedgerOnboardingImg, svg: LedgerOnboardingSvg },
  walletConnect: { img: WalletConnectImg, svg: WalletConnectSvg },
  walletConnectOnboarding: { img: WalletConnectOnboardingImg, svg: WalletConnectOnboardingSvg },
} as const;

export type WalletImages = keyof typeof WalletTypeImages;

export default WalletTypeImages;
