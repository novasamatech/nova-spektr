import { type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';
import { useTransactionAsset } from '../hooks/useTransactionAsset';

type Props = {
  operation: MultisigTransaction;
};

export const TransferOperationTitle = ({ operation }: Props) => {
  const { t } = useI18n();
  const transaction = getTransactionFromMultisigTx(operation);
  const asset = useTransactionAsset(operation);
  const amount = transaction ? getTransactionAmount(transaction) : null;

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.transfer', { asset: asset?.symbol })}
        icon="transferMst"
      />

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
