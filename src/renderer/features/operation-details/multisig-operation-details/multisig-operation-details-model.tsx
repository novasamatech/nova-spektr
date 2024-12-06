import { useUnit } from 'effector-react';

import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { TransactionTitle } from '@/entities/transaction';
import { WalletIcon, walletModel } from '@/entities/wallet';
import { multisigOperationsFeature } from '@/features/multisig-operations';

export const multisigOperationDetailsFeature = createFeature({
  name: 'multisig/operation details',
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationDetails, {
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

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationTitle, ({ operation }) => {
  const transaction = getTransactionFromMultisigTx(operation);

  if (!transaction) {
    return (
      <>
        <TransactionTitle className="flex-1 overflow-hidden" tx={transaction} />

        <ChainTitle chainId={operation.chainId} className="w-[114px]" />
      </>
    );
  }

  return null;
});
