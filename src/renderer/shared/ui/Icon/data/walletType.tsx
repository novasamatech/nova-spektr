import WatchOnlyOldImg, { ReactComponent as WatchOnlyOldSvg } from '@images/walletTypes/watchOnlyOld.svg';
import WatchOnlyImg, { ReactComponent as WatchOnlySvg } from '@images/walletTypes/watchOnly.svg';
import WatchOnlyOnboardingImg, {
  ReactComponent as WatchOnlyOnboardingSvg,
} from '@images/walletTypes/watchOnlyOnboardiing.svg';
import MultisigOldImg, { ReactComponent as MultisigOldSvg } from '@images/walletTypes/multisigOld.svg';
import MultisigImg, { ReactComponent as MultisigSvg } from '@images/walletTypes/multisig.svg';
import VaultImg, { ReactComponent as VaultSvg } from '@images/walletTypes/vault.svg';
import NovaWalletOldImg, { ReactComponent as NovaWalletOldSvg } from '@images/walletTypes/novaWalletOld.svg';
import NovaWalletImg, { ReactComponent as NovaWalletSvg } from '@images/walletTypes/novaWallet.svg';
import LedgerOnboardingImg, { ReactComponent as LedgerOnboardingSvg } from '@images/walletTypes/ledgerOnboarding.svg';
import WalletConnectImg, { ReactComponent as WalletConnectSvg } from '@images/walletTypes/walletConnect.svg';
import WalletConnectOnboardingImg, {
  ReactComponent as WalletConnectOnboardingSvg,
} from '@images/walletTypes/walletConnectOnboarding.svg';
import NovaWalletOnboardingImg, {
  ReactComponent as NovaWalletOnboardingSvg,
} from '@images/walletTypes/novaWalletOnboarding.svg';

// TODO: Remove old wallet images after left menu styles updated
const WalletTypeImages = {
  watchOnly: { svg: WatchOnlySvg, img: WatchOnlyImg },
  watchOnlyOld: { svg: WatchOnlyOldSvg, img: WatchOnlyOldImg }, // used in wallet card and sign button
  watchOnlyOnboarding: { svg: WatchOnlyOnboardingSvg, img: WatchOnlyOnboardingImg },
  multisigOld: { svg: MultisigOldSvg, img: MultisigOldImg }, // used in wallet menu and wallet card
  multisig: { svg: MultisigSvg, img: MultisigImg },
  vault: { svg: VaultSvg, img: VaultImg },
  novaWalletOld: { img: NovaWalletOldImg, svg: NovaWalletOldSvg }, // used in wallet menu, wallet card and sign button
  novaWallet: { img: NovaWalletImg, svg: NovaWalletSvg },
  novaWalletOnboarding: { img: NovaWalletOnboardingImg, svg: NovaWalletOnboardingSvg },
  ledgerOnboarding: { img: LedgerOnboardingImg, svg: LedgerOnboardingSvg },
  walletConnect: { img: WalletConnectImg, svg: WalletConnectSvg },
  walletConnectOnboarding: { img: WalletConnectOnboardingImg, svg: WalletConnectOnboardingSvg },
} as const;

export type WalletImages = keyof typeof WalletTypeImages;

export default WalletTypeImages;
