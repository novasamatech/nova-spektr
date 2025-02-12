import { chainsService } from '@/shared/api/network';
import { type DecodedTransaction, type Transaction } from '@/shared/core';
import { cnTw, getAssetById } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance } from '@/entities/price';
import { getTransactionAmount } from '@/entities/transaction';

type Props = {
  tx: Transaction | DecodedTransaction;
  className?: string;
};

export const TransactionAmount = ({ tx, className }: Props) => {
  const assetId = tx?.args.assetId || tx?.args.asset;
  const asset = getAssetById(assetId, chainsService.getChainById(tx.chainId)?.assets);
  const value = getTransactionAmount(tx);

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
