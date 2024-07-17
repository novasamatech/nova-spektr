import { chainsService } from '@shared/api/network';
import { type DecodedTransaction, type Transaction } from '@shared/core';
import { cnTw, getAssetById } from '@shared/lib/utils';

import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { getTransactionAmount } from '@entities/transaction';

type Props = {
  tx: Transaction | DecodedTransaction;
  className?: string;
};

export const TransactionAmount = ({ tx, className }: Props) => {
  const asset = tx && getAssetById(tx.args.asset, chainsService.getChainById(tx.chainId)?.assets);
  const value = getTransactionAmount(tx);

  if (!asset || !value) {
    return null;
  }

  return (
    <div className={cnTw('flex flex-col gap-y-1 items-center')}>
      <AssetBalance
        value={value}
        asset={asset}
        className={cnTw('font-manrope text-text-primary text-[32px] leading-[36px] font-bold', className)}
      />
      <AssetFiatBalance asset={asset} amount={value} className="text-headline" />
    </div>
  );
};
