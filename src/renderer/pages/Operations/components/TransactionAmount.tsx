import { useEffect, useState, ComponentProps } from 'react';

import { DecodedTransaction, Transaction } from '@renderer/entities/transaction';
import { chainsService } from '@renderer/entities/network';
import { AssetBalance } from '@renderer/entities/asset';
import { getAssetById } from '@renderer/shared/lib/utils';
import { getTransactionAmount } from '../common/utils';
import type { Asset } from '@renderer/shared/core';

type Props = {
  tx: Transaction | DecodedTransaction;
};

type BalanceProps = Pick<ComponentProps<typeof AssetBalance>, 'className' | 'showIcon' | 'wrapperClassName'>;

export const TransactionAmount = ({ tx, ...balanceProps }: Props & BalanceProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const chain = chainsService.getChainById(tx.chainId);

    setAssets(chain?.assets || []);
  }, []);

  const asset = getAssetById(tx.args.asset, assets);
  const value = getTransactionAmount(tx);

  if (!asset || !value) return null;

  return <AssetBalance value={value} asset={asset} showIcon {...balanceProps} />;
};
