import { useI18n } from '@/shared/i18n';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/multisig';
import { XcmChains } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';
import { useTransactionAsset } from '../hooks/useTransactionAsset';

type Props = {
  operation: MultisigOperation;
};

export const XcmTransferOperationTitle = ({ operation }: Props) => {
  const { t } = useI18n();
  const transaction = operationDetailsUtils.getOperationData(operation);
  const asset = useTransactionAsset(operation);
  const amount = transaction ? getTransactionAmount(transaction) : null;

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

      <XcmChains
        chainIdFrom={operation.chainId}
        chainIdTo={transaction?.args?.destinationChain}
        className="w-[114px]"
      />
    </>
  );
};
