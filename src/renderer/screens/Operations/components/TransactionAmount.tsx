import { useEffect, useState, ComponentProps } from 'react';

import { DecodedTransaction, Transaction } from '@renderer/entities/transaction/model/transaction';
import { useChains } from '@renderer/entities/network/lib/chainsService';
import { Asset } from '@renderer/entities/asset/model/asset';
import { getAssetById } from '@renderer/shared/lib/utils';
import { getTransactionAmount } from '@renderer/screens/Operations/common/utils';
import { BalanceNew } from '@renderer/entities/asset';

type Props = {
  tx: Transaction | DecodedTransaction;
};

type BalanceProps = Pick<ComponentProps<typeof BalanceNew>, 'className' | 'showIcon' | 'wrapperClassName'>;

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
