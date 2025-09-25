import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { getAssetByOnChainId } from '@/shared/lib/utils';
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

export const GovernanceOperationTitle = ({ operation, title }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const transaction = operation.transaction;

  const asset = transaction && getAssetByOnChainId(transaction.args.asset, chains[operation.chainId]?.assets);
  const amount = transaction && getTransactionAmount(transaction);

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
