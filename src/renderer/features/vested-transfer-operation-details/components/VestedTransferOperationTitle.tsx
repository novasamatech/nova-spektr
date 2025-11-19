import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  title: string;
  operation: MultisigOperation;
};

export const VestedTransferOperationTitle = ({ operation, title }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const transaction = operation.transaction;

  const chain = chains[operation.chainId];
  const asset = chain ? getNativeAsset(chain.assets) : null;

  let amount: string | BN | null = null;
  if (transaction?.type === TransactionType.BATCH_ALL) {
    const batchAmounts: string[] = transaction.args?.transactions?.map(getTransactionAmount);
    amount = batchAmounts.reduce((amount, currentAmount) => amount.add(new BN(currentAmount)), new BN(0));
  } else {
    amount = transaction && getTransactionAmount(transaction);
  }

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={t(title || '', { asset: asset?.symbol })} />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
