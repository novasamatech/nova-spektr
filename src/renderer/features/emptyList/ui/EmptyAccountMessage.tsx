import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';

const Messages: Record<WalletType, string> = {
  [WalletType.POLKADOT_VAULT]: 'emptyState.createOrImportAccount',
  [WalletType.MULTISIG]: 'emptyState.createMultisig',
  [WalletType.FLEXIBLE_MULTISIG]: 'emptyState.createFlexibleMultisig',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'emptyState.createAccount',
  [WalletType.NOVA_WALLET]: 'emptyState.createAccount',
  [WalletType.PROXIED]: 'emptyState.createAccount',
  [WalletType.SINGLE_PARITY_SIGNER]: 'emptyState.createAccount',
  [WalletType.WALLET_CONNECT]: 'emptyState.createAccount',
  [WalletType.WATCH_ONLY]: 'emptyState.createAccount',
};

type Props = {
  walletType?: WalletType;
};

export const EmptyAccountMessage = ({ walletType }: Props) => {
  const { t } = useI18n();

  return (
    <>
      {t('emptyState.accountDescription')} {walletType && t(Messages[walletType])}
    </>
  );
};
