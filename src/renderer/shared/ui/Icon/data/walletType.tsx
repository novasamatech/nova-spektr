import WatchOnlyBackgroundImg, {
  ReactComponent as WatchOnlyBackgroundSvg,
} from '@shared/assets/images/walletTypes/watchOnlyBackground.svg';
import WatchOnlyOnboardingImg, {
  ReactComponent as WatchOnlyOnboardingSvg,
} from '@shared/assets/images/walletTypes/watchOnlyOnboardiing.svg';
import MultisigBackgroundImg, {
  ReactComponent as MultisigBackgroundSvg,
} from '@shared/assets/images/walletTypes/multisigBackground.svg';
import VaultImg, { ReactComponent as VaultSvg } from '@shared/assets/images/walletTypes/vault.svg';
import VaultBackgroundImg, {
  ReactComponent as VaultBackgroundSvg,
} from '@shared/assets/images/walletTypes/vaultBackground.svg';
import VaultOnboardingImg, {
  ReactComponent as VaultOnboardingSvg,
} from '@shared/assets/images/walletTypes/vaultOnboarding.svg';
import NovaWalletImg, { ReactComponent as NovaWalletSvg } from '@shared/assets/images/walletTypes/novaWallet.svg';
import NovaWalletBackgroundImg, {
  ReactComponent as NovaWalletBackgroundSvg,
} from '@shared/assets/images/walletTypes/novaWalletBackground.svg';
import LedgerOnboardingImg, {
  ReactComponent as LedgerOnboardingSvg,
} from '@shared/assets/images/walletTypes/ledgerOnboarding.svg';
import WalletConnectImg, {
  ReactComponent as WalletConnectSvg,
} from '@shared/assets/images/walletTypes/walletConnect.svg';
import WalletConnectBackgroundImg, {
  ReactComponent as WalletConnectBackgroundSvg,
} from '@shared/assets/images/walletTypes/walletConnectBackground.svg';
import WalletConnectOnboardingImg, {
  ReactComponent as WalletConnectOnboardingSvg,
} from '@shared/assets/images/walletTypes/walletConnectOnboarding.svg';
import NovaWalletOnboardingImg, {
  ReactComponent as NovaWalletOnboardingSvg,
} from '@shared/assets/images/walletTypes/novaWalletOnboarding.svg';
import ProxyBackgroundImg, {
  ReactComponent as ProxyBackgroundSvg,
} from '@shared/assets/images/walletTypes/proxyBackground.svg';

const WalletTypeImages = {
  watchOnlyBackground: { svg: WatchOnlyBackgroundSvg, img: WatchOnlyBackgroundImg },
  watchOnlyOnboarding: { svg: WatchOnlyOnboardingSvg, img: WatchOnlyOnboardingImg },
  multisigBackground: { svg: MultisigBackgroundSvg, img: MultisigBackgroundImg },
  vault: { svg: VaultSvg, img: VaultImg },
  vaultBackground: { svg: VaultBackgroundSvg, img: VaultBackgroundImg },
  vaultOnboarding: { svg: VaultOnboardingSvg, img: VaultOnboardingImg },
  novaWallet: { img: NovaWalletImg, svg: NovaWalletSvg },
  novaWalletBackground: { img: NovaWalletBackgroundImg, svg: NovaWalletBackgroundSvg },
  novaWalletOnboarding: { img: NovaWalletOnboardingImg, svg: NovaWalletOnboardingSvg },
  ledgerOnboarding: { img: LedgerOnboardingImg, svg: LedgerOnboardingSvg },
  walletConnect: { img: WalletConnectImg, svg: WalletConnectSvg },
  walletConnectBackground: { img: WalletConnectBackgroundImg, svg: WalletConnectBackgroundSvg },
  walletConnectOnboarding: { img: WalletConnectOnboardingImg, svg: WalletConnectOnboardingSvg },
  proxiedBackground: { svg: ProxyBackgroundSvg, img: ProxyBackgroundImg },
} as const;

export type WalletImages = keyof typeof WalletTypeImages;

export default WalletTypeImages;
