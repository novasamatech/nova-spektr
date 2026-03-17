import { cnTw } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { AssetFiatBalance } from '@/widgets/price';

type Props = {
  operation: MultisigOperation;
  className?: string;
};

// TODO it should be separated into multiple components for each set of operations (transfer/staking)
export const TransactionAmount = ({ operation, className }: Props) => {
  const transaction = operation.transaction;
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
        className={cnTw('font-manrope text-[32px] leading-[36px] font-bold text-text-primary', className)}
      />
      <AssetFiatBalance asset={asset} amount={value} className="text-headline" />
    </div>
  );
};
