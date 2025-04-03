import { cnTw } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { AssetFiatBalance } from '@/entities/price';
import { getTransactionAmount, useDecodedTransaction, useTransactionAsset } from '@/entities/transaction';

type Props = {
  operation: MultisigOperation;
  className?: string;
};

// TODO it should be separated into multiple components for each set of operations (transfer/staking)
export const TransactionAmount = ({ operation, className }: Props) => {
  const transaction = useDecodedTransaction(operation.transaction, operation.chainId);
  const value = transaction ? getTransactionAmount(transaction) : null;
  const asset = useTransactionAsset(transaction, operation.chainId);

  if (!asset || !value) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-y-1">
      <AssetBalance
        value={value}
        asset={asset}
        className={cnTw('font-manrope text-[32px] font-bold leading-[36px] text-text-primary', className)}
      />
      <AssetFiatBalance asset={asset} amount={value} className="text-headline" />
    </div>
  );
};
