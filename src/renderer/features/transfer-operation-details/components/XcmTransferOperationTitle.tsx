import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type AnyDecodedTransaction } from '@/domains/network';
import { XcmChains } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';
import { useTransactionAsset } from '../hooks/useTransactionAsset';

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
  variant: 'long' | 'short';
};

export const XcmTransferOperationTitle = ({ transaction, chainId, variant }: Props) => {
  const { t } = useI18n();
  const asset = useTransactionAsset(transaction, chainId);
  const amount = transaction ? getTransactionAmount(transaction) : null;
  const destinationChain = operationDetailsUtils.getDestinationChain(transaction);

  if (variant === 'short') {
    return (
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
        icon="crossChain"
      />
    );
  }

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
        icon="crossChain"
      />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      {destinationChain ? <XcmChains chainIdFrom={chainId} chainIdTo={destinationChain} className="w-[114px]" /> : null}
    </>
  );
};
