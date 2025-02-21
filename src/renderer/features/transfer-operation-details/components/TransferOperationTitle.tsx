import { type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { AssetBalance } from '@/entities/asset';
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
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
