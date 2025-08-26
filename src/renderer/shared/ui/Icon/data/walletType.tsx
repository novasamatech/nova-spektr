/* eslint-disable import-x/max-dependencies */

import FlexibleMultisigBackgroundIcon from '@/shared/assets/images/walletTypes/flexibleMultisigBackground.svg?jsx';
import LedgerOnboardingIcon from '@/shared/assets/images/walletTypes/ledgerOnboarding.svg?jsx';
import MultisigBackgroundIcon from '@/shared/assets/images/walletTypes/multisigBackground.svg?jsx';
import NovaWalletIcon from '@/shared/assets/images/walletTypes/novaWallet.svg?jsx';
import NovaWalletBackgroundIcon from '@/shared/assets/images/walletTypes/novaWalletBackground.svg?jsx';
import NovaWalletOnboardingIcon from '@/shared/assets/images/walletTypes/novaWalletOnboarding.svg?jsx';
import PolkadotExtension from '@/shared/assets/images/walletTypes/polkadotExtension.svg?jsx';
import PolkadotExtensionBackgroundIcon from '@/shared/assets/images/walletTypes/polkadotExtensionBackground.svg?jsx';
import PolkadotExtensionOnboardingIcon from '@/shared/assets/images/walletTypes/polkadotExtensionOnboarding.svg?jsx';
import ProxiedIcon from '@/shared/assets/images/walletTypes/proxied.svg?jsx';
import ProxiedBackgroundIcon from '@/shared/assets/images/walletTypes/proxiedBackground.svg?jsx';
import SubwalletExtension from '@/shared/assets/images/walletTypes/subWalletExtension.svg?jsx';
import SubwalletExtensionBackground from '@/shared/assets/images/walletTypes/subWalletExtensionBackground.svg?jsx';
import SubwalletExtensionOnboarding from '@/shared/assets/images/walletTypes/subWalletExtensionOnboarding.svg?jsx';
import TalismanExtension from '@/shared/assets/images/walletTypes/talismanExtension.svg?jsx';
import TalismanExtensionBackground from '@/shared/assets/images/walletTypes/talismanExtensionBackground.svg?jsx';
import TalismanExtensionOnboarding from '@/shared/assets/images/walletTypes/talismanExtensionOnboarding.svg?jsx';
import VaultIcon from '@/shared/assets/images/walletTypes/vault.svg?jsx';
import VaultBackgroundIcon from '@/shared/assets/images/walletTypes/vaultBackground.svg?jsx';
import VaultOnboardingIcon from '@/shared/assets/images/walletTypes/vaultOnboarding.svg?jsx';
import WalletConnectIcon from '@/shared/assets/images/walletTypes/walletConnect.svg?jsx';
import WalletConnectBackgroundIcon from '@/shared/assets/images/walletTypes/walletConnectBackground.svg?jsx';
import WalletConnectOnboardingIcon from '@/shared/assets/images/walletTypes/walletConnectOnboarding.svg?jsx';
import WatchOnlyBackgroundIcon from '@/shared/assets/images/walletTypes/watchOnlyBackground.svg?jsx';
import WatchOnlyOnboardingIcon from '@/shared/assets/images/walletTypes/watchOnlyOnboardiing.svg?jsx';

const WalletTypeImages = {
  watchOnlyBackground: { svg: WatchOnlyBackgroundIcon },
  watchOnlyOnboarding: { svg: WatchOnlyOnboardingIcon },
  multisigBackground: { svg: MultisigBackgroundIcon },
  flexibleMultisigBackground: { svg: FlexibleMultisigBackgroundIcon },
  vault: { svg: VaultIcon },
  vaultBackground: { svg: VaultBackgroundIcon },
  vaultOnboarding: { svg: VaultOnboardingIcon },
  novaWallet: { svg: NovaWalletIcon },
  novaWalletBackground: { svg: NovaWalletBackgroundIcon },
  novaWalletOnboarding: { svg: NovaWalletOnboardingIcon },
  ledgerOnboarding: { svg: LedgerOnboardingIcon },
  walletConnect: { svg: WalletConnectIcon },
  walletConnectBackground: { svg: WalletConnectBackgroundIcon },
  walletConnectOnboarding: { svg: WalletConnectOnboardingIcon },
  proxied: { svg: ProxiedIcon },
  proxiedBackground: { svg: ProxiedBackgroundIcon },
  polkadotExtension: { svg: PolkadotExtension },
  polkadotExtensionOnboarding: { svg: PolkadotExtensionOnboardingIcon },
  polkadotExtensionBackground: { svg: PolkadotExtensionBackgroundIcon },
  talismanExtensionBackground: { svg: TalismanExtensionBackground },
  talismanExtension: { svg: TalismanExtension },
  talismanExtensionOnboarding: { svg: TalismanExtensionOnboarding },
  subwalletExtension: { svg: SubwalletExtension },
  subwalletExtensionBackground: { svg: SubwalletExtensionBackground },
  subwalletExtensionOnboarding: { svg: SubwalletExtensionOnboarding },
} as const;

export type WalletImages = keyof typeof WalletTypeImages;

export default WalletTypeImages;
