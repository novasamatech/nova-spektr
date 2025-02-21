import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { useI18n } from '@/shared/i18n';
import { AssetBalance } from '@/entities/asset';
import { XcmChains } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';
import { useTransactionAsset } from '../hooks/useTransactionAsset';

type Props = {
  operation: MultisigTransactionDS | FlexibleMultisigTransactionDS;
};

export const XcmTransferOperationTitle = ({ operation }: Props) => {
  const { t } = useI18n();
  const transaction = getTransactionFromMultisigTx(operation);
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
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <XcmChains chainIdFrom={operation.chainId} chainIdTo={transaction?.args.destinationChain} className="w-[114px]" />
    </>
  );
};
