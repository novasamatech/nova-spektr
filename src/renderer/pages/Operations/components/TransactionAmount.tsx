import { useUnit } from 'effector-react';

import { DecodedTransaction, Transaction } from '@renderer/entities/transaction';
import { chainsService } from '@renderer/entities/network';
import { AssetBalance } from '@renderer/entities/asset';
import { cnTw, getAssetById } from '@renderer/shared/lib/utils';
import { getTransactionAmount } from '../common/utils';
import { priceProviderModel } from '@renderer/entities/price';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';

type Props = {
  tx: Transaction | DecodedTransaction;
  className?: string;
};

export const TransactionAmount = ({ tx, className }: Props) => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const asset = tx && getAssetById(tx.args.asset, chainsService.getChainById(tx.chainId)?.assets);
  const value = getTransactionAmount(tx);

  if (!asset || !value) return null;

  if (!fiatFlag) {
    return <AssetBalance value={value} asset={asset} className={className} />;
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
