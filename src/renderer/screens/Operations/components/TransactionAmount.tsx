import React, { useEffect, useState } from 'react';

import { Transaction } from '@renderer/domain/transaction';
import { useChains } from '@renderer/services/network/chainsService';
import { Asset } from '@renderer/domain/asset';
import { getAssetById } from '@renderer/shared/utils/assets';
import { BalanceNew } from '@renderer/components/common';
import { getTransactionAmount } from '@renderer/screens/Operations/common/utils';

type Props = {
  tx: Transaction;
};

type BalanceProps = Pick<React.ComponentProps<typeof BalanceNew>, 'className' | 'showIcon'>;

const TransactionAmount = ({ tx, ...balanceProps }: Props & BalanceProps) => {
  const { getChainById } = useChains();
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    getChainById(tx.chainId).then((chain) => setAssets(chain?.assets || []));
  }, []);

  const asset = getAssetById(tx.args.assetId, assets);
  const value = getTransactionAmount(tx);

  if (!asset || !value) return null;

  return <BalanceNew value={value} asset={asset} showIcon {...balanceProps} />;
};

export default TransactionAmount;
