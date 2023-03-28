import { ReactNode, useEffect, useState } from 'react';

import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { getTransactionType } from '../common/utils';
import { DEFAULT } from '@shared/constants/common';
import { useChains } from '@renderer/services/network/chainsService';
import { Asset } from '@renderer/domain/asset';
import { Balance } from '@renderer/components/ui';
import { getAssetById } from '@renderer/shared/utils/assets';

type Props = {
  transaction: Transaction;
};

type TransactionProps = {
  transaction: Transaction;
  asset?: Asset;
};

const TransactionInfo = ({ transaction, asset }: TransactionProps) => {
  if (!asset) return <></>;

  return (
    <div className="flex gap-2">
      <div className="flex items-center justify-center bg-shade-70 border border-shade-20 rounded-full w-6 h-6">
        <img src={asset.icon} alt={asset.name} width={16} height={16} />
      </div>

      <Balance value={transaction.args.value} symbol={asset.symbol} precision={asset.precision} />
    </div>
  );
};

const StakeMore = ({ transaction, asset }: TransactionProps) => {
  if (!asset) return <></>;

  return (
    <div className="flex gap-2">
      <div className="flex items-center justify-center bg-shade-70 border border-shade-20 rounded-full w-6 h-6">
        <img src={asset.icon} alt={asset.name} width={16} height={16} />
      </div>

      <Balance value={transaction.args.maxAdditional} symbol={asset.symbol} precision={asset.precision} />
    </div>
  );
};

const ShortTransactionInfo = ({ transaction }: Props) => {
  const { getChainById } = useChains();
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    getChainById(transaction.chainId).then((chain) => setAssets(chain?.assets || []));
  }, []);

  const asset = getAssetById(assets || [], transaction.args.assetId);

  const Transactions: Record<TransactionType | typeof DEFAULT, ReactNode> = {
    [TransactionType.ASSET_TRANSFER]: <TransactionInfo transaction={transaction} asset={asset} />,
    [TransactionType.ORML_TRANSFER]: <TransactionInfo transaction={transaction} asset={asset} />,
    [TransactionType.TRANSFER]: <TransactionInfo transaction={transaction} asset={asset} />,

    // Staking
    [TransactionType.BOND]: <TransactionInfo transaction={transaction} asset={asset} />,
    [TransactionType.STAKE_MORE]: <StakeMore transaction={transaction} asset={asset} />,
    [TransactionType.RESTAKE]: <TransactionInfo transaction={transaction} asset={asset} />,
    [TransactionType.UNSTAKE]: <TransactionInfo transaction={transaction} asset={asset} />,
    [TransactionType.REDEEM]: <></>,
    [TransactionType.NOMINATE]: <></>,
    [TransactionType.DESTINATION]: <></>,

    // Technical
    [TransactionType.CHILL]: <></>,
    [TransactionType.BATCH_ALL]: <></>,
    [DEFAULT]: <></>,
  };

  return <>{Transactions[getTransactionType(transaction) || DEFAULT]}</>;
};

export default ShortTransactionInfo;
