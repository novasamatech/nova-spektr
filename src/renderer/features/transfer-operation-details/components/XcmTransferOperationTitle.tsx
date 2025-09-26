import { type ChainId, type DecodedTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { XcmChains } from '@/entities/chain';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  useTransactionAsset,
} from '@/entities/transaction';

type Props = {
  transaction: DecodedTransaction | null;
  chainId: ChainId;
};

export const XcmTransferOperationTitle = ({ transaction, chainId }: Props) => {
  const { t } = useI18n();
  const coreTx = findCoreTransaction(transaction);
  const asset = useTransactionAsset(coreTx, chainId);
  const amount = coreTx ? getTransactionAmount(coreTx) : null;

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
      />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      <XcmChains chainIdFrom={chainId} chainIdTo={transaction?.args.destinationChain} className="w-[114px]" />
    </>
  );
};
