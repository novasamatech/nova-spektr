import { DecodedTransaction, Transaction } from '@renderer/entities/transaction';
import { chainsService } from '@renderer/entities/network';
import { AssetBalance, AssetFiatBalance } from '@renderer/entities/asset';
import { cnTw, getAssetById } from '@renderer/shared/lib/utils';
import { getTransactionAmount } from '../common/utils';
import type { Asset } from '@renderer/shared/core';

type Props = {
  tx: Transaction | DecodedTransaction;
  className?: string;
};

export const TransactionAmount = ({ tx, className }: Props) => {
  const asset = tx && getAssetById(tx.args.asset, chainsService.getChainById(tx.chainId)?.assets);
  const value = getTransactionAmount(tx);

  if (!asset || !value) return null;

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
