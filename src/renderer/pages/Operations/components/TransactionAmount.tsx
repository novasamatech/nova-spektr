import { type ApiPromise } from '@polkadot/api';

import { type Asset, type Chain, type DecodedTransaction, type Transaction } from '@/shared/core';
import { cnTw, getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance } from '@/entities/price';
import { getTransactionAmount } from '@/entities/transaction';

type Props = {
  api: ApiPromise;
  chain: Chain;
  tx: Transaction | DecodedTransaction;
  className?: string;
};

export const TransactionAmount = ({ api, chain, tx, className }: Props) => {
  const value = getTransactionAmount(tx);
  let asset: Asset;
  if (tx) {
    if (tx.args.assetId) {
      asset = getAssetByTypeExtras(api, chain.assets, tx.args.assetId) ?? chain.assets[0];
    } else {
      asset = getAssetById(tx.args.asset, chain.assets) ?? chain.assets[0];
    }
  } else {
    asset = chain.assets[0];
  }

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
