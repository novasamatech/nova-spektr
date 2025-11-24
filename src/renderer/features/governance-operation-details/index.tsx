import { useUnit } from 'effector-react';
import { t } from 'i18next';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle, findCoreTransaction, getTransactionAmount } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

import { GovernanceDelegateDetails } from './components/GovernanceDelegateDetails';
import { GovernanceVoteDetails } from './components/GovernanceVoteDetails';

export const governanceOperationDetailFeature = createFeature({
  name: 'governance/operation-details',
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: t('operations.titles.unlock'),
    [TransactionType.VOTE]: t('operations.titles.vote'),
    [TransactionType.REMOVE_VOTE]: t('operations.titles.removeVote'),
    [TransactionType.DELEGATE]: t('operations.titles.delegate'),
    [TransactionType.UNDELEGATE]: t('operations.titles.undelegate'),
    [TransactionType.EDIT_DELEGATION]: t('operations.titles.editDelegation'),
  };

  return Title[transactionType];
};

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Title: { [key in TransactionType]?: IconNames } = {
    [TransactionType.UNLOCK]: 'unlockMst',
    [TransactionType.VOTE]: 'voteMst',
    [TransactionType.REMOVE_VOTE]: 'retractMst',
    [TransactionType.DELEGATE]: 'delegateMst',
    [TransactionType.UNDELEGATE]: 'undelegateMst',
    [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
  };

  return Title[transactionType];
};

multisigOperationsSDK(governanceOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const icon = transaction?.type && getOperationIcon(transaction.type);
    if (icon) {
      return icon;
    }
  },
  title({ operation, showCoreTransaction }) {
    const { t: translator } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);

    if (title) {
      const asset = transaction && getAssetById(transaction.args.asset, chains[operation.chainId]?.assets);
      const amount = transaction && getTransactionAmount(transaction);

      return {
        name: (
          <TransactionTitle
            className="flex-1 overflow-hidden"
            title={translator(title || '', { asset: asset?.symbol })}
          />
        ),
        amount:
          asset && amount ? (
            <Box width="160px" direction="row" gap={2} verticalAlign="center">
              <AssetIcon asset={asset} size={32} />
              <AssetBalance value={amount} asset={asset} />
            </Box>
          ) : undefined,
        chain: <ChainTitle chainId={operation.chainId} className="w-[114px]" />,
      };
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);
    if (title) {
      return <TransactionTitle className="overflow-hidden" title={t(title || '')} />;
    }
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (
      transaction?.type &&
      [TransactionType.UNLOCK, TransactionType.VOTE, TransactionType.REMOVE_VOTE].includes(transaction.type)
    ) {
      return <GovernanceVoteDetails operation={operation} />;
    }

    if (
      transaction?.type &&
      [TransactionType.DELEGATE, TransactionType.UNDELEGATE, TransactionType.EDIT_DELEGATION].includes(transaction.type)
    ) {
      return <GovernanceDelegateDetails operation={operation} />;
    }

    return null;
  },
});
