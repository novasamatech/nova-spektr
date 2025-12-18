import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { getNativeAsset } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { AssetFiatBalance } from '@/entities/price';
import { getTransactionAmount, isMultiTransferTransaction } from '@/entities/transaction';

type Props = {
  operation: MultisigOperation;
};

export const TransactionAmount = memo(({ operation }: Props) => {
  const chains = useUnit(networkModel.$chains);

  if (!isMultiTransferTransaction(operation.transaction)) {
    return null;
  }

  const chain = chains[operation.chainId];
  const asset = chain ? getNativeAsset(chain.assets) : null;
  const transaction = operation.transaction;

  const batchAmounts: string[] = transaction?.args?.transactions?.map(getTransactionAmount);
  const amount = batchAmounts.reduce((amount, currentAmount) => amount.add(new BN(currentAmount)), BN_ZERO);

  if (!asset || !amount) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-y-1">
      <AssetBalance
        value={amount}
        asset={asset}
        className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
      />
      <AssetFiatBalance asset={asset} amount={amount} className="text-headline" />
    </div>
  );
});
