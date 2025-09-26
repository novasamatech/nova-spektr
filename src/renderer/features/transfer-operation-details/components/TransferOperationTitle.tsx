import { type ChainId, type DecodedTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';

type Props = {
  transaction: DecodedTransaction | null;
  chainId: ChainId;
};

export const TransferOperationTitle = ({ transaction, chainId }: Props) => {
  const { t } = useI18n();

  const asset = useTransactionAsset(transaction, chainId);
  const amount = transaction ? getTransactionAmount(transaction) : null;

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.transfer', { asset: asset?.symbol })}
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
};
