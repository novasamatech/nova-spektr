import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { cnTw } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { AssetFiatBalance } from '@/entities/price';
import { getTransactionAmount } from '@/entities/transaction';
import { useTransactionAsset } from '../hooks/useTransactionAsset';

type Props = {
  operation: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  className?: string;
};

// TODO it should be separated into multiple components for each set of operations (transfer/staking)
export const TransactionAmount = ({ operation, className }: Props) => {
  const transaction = getTransactionFromMultisigTx(operation);
  const value = transaction ? getTransactionAmount(transaction) : null;
  const asset = useTransactionAsset(operation);

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
