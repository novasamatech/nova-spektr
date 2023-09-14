import { useEffect, useState, ComponentProps } from 'react';

import { DecodedTransaction, Transaction } from '@renderer/entities/transaction';
import { useChains } from '@renderer/entities/network';
import { Asset, AssetBalance } from '@renderer/entities/asset';
import { getAssetById } from '@renderer/shared/lib/utils';
import { getTransactionAmount } from '../common/utils';

type Props = {
  tx: Transaction | DecodedTransaction;
};

type BalanceProps = Pick<ComponentProps<typeof AssetBalance>, 'className' | 'showIcon' | 'wrapperClassName'>;

export const TransactionAmount = ({ tx, ...balanceProps }: Props & BalanceProps) => {
  const { getChainById } = useChains();
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const chain = getChainById(tx.chainId);

    setAssets(chain?.assets || []);
  }, []);

  const asset = getAssetById(tx.args.assetId, assets);
  const value = getTransactionAmount(tx);

  if (!asset || !value) return null;

  return <AssetBalance value={value} asset={asset} showIcon {...balanceProps} />;
};
