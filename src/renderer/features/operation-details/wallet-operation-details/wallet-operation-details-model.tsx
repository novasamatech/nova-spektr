import { useUnit } from 'effector-react';

import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { WalletIcon, walletModel } from '@/entities/wallet';
import { multisigOperationsFeature } from '@/features/multisig-operations';

export const walletOperationDetailsFeature = createFeature({
  name: 'Wallet operation details',
});

walletOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const activeWallet = useUnit(walletModel.$activeWallet);

    if (!activeWallet) return null;

    const accountId = activeWallet.accounts[0].accountId;
    const chain = chains[operation.chainId];

    return (
      <DetailRow label={t('operation.details.multisigWallet')}>
        <Box direction="row" gap={2}>
          <WalletIcon type={activeWallet.type} size={16} />
          <span>{activeWallet.name}</span>
          <AccountExplorers accountId={accountId} chain={chain} />
        </Box>
      </DetailRow>
    );
  },
  order: 0,
});
