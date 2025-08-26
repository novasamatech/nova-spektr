import { type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { walletUtils } from '@/entities/wallet';
import { polkadotExtensionService } from '@/features/extension-wallet';
import { FlexibleWalletDetails } from '../wallets/FlexibleWalletDetails';
import { MultisigWalletDetails } from '../wallets/MultisigWalletDetails';
import { ProxiedWalletDetails } from '../wallets/ProxiedWalletDetails';
import { SimpleWalletDetails } from '../wallets/SimpleWalletDetails';
import { VaultWalletDetails } from '../wallets/VaultWalletDetails';
import { WalletConnectDetails } from '../wallets/WalletConnectDetails';
import { WatchOnlyWalletDetails } from '../wallets/WatchOnlyWalletDetails';

type Props = {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: VoidFunction;
};

export const WalletDetails = ({ isOpen, wallet, onClose }: Props) => {
  if (!isOpen || nullable(wallet)) {
    return null;
  }

  if (walletUtils.isWatchOnly(wallet)) {
    return <WatchOnlyWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isRegularMultisig(wallet)) {
    return <MultisigWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isFlexibleMultisig(wallet)) {
    return <FlexibleWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isWalletConnect(wallet) || walletUtils.isNovaWallet(wallet)) {
    return <WalletConnectDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return <VaultWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isProxied(wallet)) {
    return <ProxiedWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (polkadotExtensionService.isExtensionWallet(wallet) || walletUtils.isSingleShard(wallet)) {
    return <SimpleWalletDetails wallet={wallet} onClose={onClose} />;
  }

  return null;
};
