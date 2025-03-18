import { memo } from 'react';

import { chainsService } from '@/shared/api/network';
import { type ChainId, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type AnyDecodedTransaction } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle, getTransactionAmount, getTransactionType } from '@/entities/transaction';

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: 'operations.titles.unlock',
    [TransactionType.VOTE]: 'operations.titles.vote',
    [TransactionType.REVOTE]: 'operations.titles.revote',
    [TransactionType.REMOVE_VOTE]: 'operations.titles.removeVote',
    [TransactionType.DELEGATE]: 'operations.titles.delegate',
    [TransactionType.UNDELEGATE]: 'operations.titles.undelegate',
    [TransactionType.EDIT_DELEGATION]: 'operations.titles.editDelegation',
  };

  return Title[transactionType];
};

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Title: { [key in TransactionType]?: IconNames } = {
    [TransactionType.UNLOCK]: 'unlockMst',
    [TransactionType.VOTE]: 'voteMst',
    [TransactionType.REVOTE]: 'revoteMst',
    [TransactionType.REMOVE_VOTE]: 'retractMst',
    [TransactionType.DELEGATE]: 'delegateMst',
    [TransactionType.UNDELEGATE]: 'undelegateMst',
    [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
  };

  return Title[transactionType];
};

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
  variant: 'long' | 'short';
};

export const GovernanceOperationTitle = memo(({ transaction, chainId, variant }: Props) => {
  const { t } = useI18n();
  const type = getTransactionType(transaction.method, transaction.section);
  const title = type ? getOperationTitle(type) : null;
  const icon = type ? getOperationIcon(type) : null;

  const assetId = operationDetailsUtils.getAssetId(transaction);
  const asset = assetId ? getAssetById(assetId, chainsService.getChainById(chainId)?.assets) : null;
  const amount = transaction && getTransactionAmount(transaction);

  if (!title || !icon) return null;

  if (variant === 'short') {
    return (
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t(title || '', { asset: asset?.symbol })}
        icon={icon}
      />
    );
  }

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t(title || '', { asset: asset?.symbol })}
        icon={icon}
      />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      <ChainTitle chainId={chainId} className="w-[114px]" />
    </>
  );
});
