import { t } from 'i18next';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';

const Messages: Record<WalletType, string> = {
  [WalletType.POLKADOT_VAULT]: t('emptyState.createOrImportAccount'),
  [WalletType.MULTISIG]: t('emptyState.createMultisig'),
  [WalletType.FLEXIBLE_MULTISIG]: t('emptyState.createFlexibleMultisig'),
  [WalletType.NOVA_WALLET]: t('emptyState.createAccount'),
  [WalletType.PROXIED]: t('emptyState.createAccount'),
  [WalletType.SINGLE_PARITY_SIGNER]: t('emptyState.createAccount'),
  [WalletType.WALLET_CONNECT]: t('emptyState.createAccount'),
  [WalletType.WATCH_ONLY]: t('emptyState.createAccount'),
  [WalletType.POLKADOT_EXTENSION]: t('emptyState.createAccount'),
  [WalletType.TALISMAN_EXTENSION]: t('emptyState.createAccount'),
  [WalletType.SUBWALLET_EXTENSION]: t('emptyState.createAccount'),
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
