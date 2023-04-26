import { ReactNode, useEffect, useState } from 'react';

import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { DEFAULT } from '@shared/constants/common';
import { useChains } from '@renderer/services/network/chainsService';
import { Asset } from '@renderer/domain/asset';
import { getAssetById } from '@renderer/shared/utils/assets';
import { BalanceNew } from '@renderer/components/common';

type Props = {
  tx: Transaction;
};

type TransactionProps = {
  tx: Transaction;
  asset?: Asset;
};

const TransactionInfo = ({ tx, asset }: TransactionProps) => {
  if (!asset) return null;

  return <BalanceNew value={tx.args.value} asset={asset} />;
};

const StakeMore = ({ tx, asset }: TransactionProps) => {
  if (!asset) return null;

  return <BalanceNew value={tx.args.maxAdditional} asset={asset} />;
};

const ShortTransactionInfo = ({ tx }: Props) => {
  const { getChainById } = useChains();
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    getChainById(tx.chainId).then((chain) => setAssets(chain?.assets || []));
  }, []);

  const asset = getAssetById(tx.args.assetId, assets);

  const Transactions: Record<TransactionType | typeof DEFAULT, ReactNode> = {
    // Transfer
    [TransactionType.ASSET_TRANSFER]: <TransactionInfo tx={tx} asset={asset} />,
    [TransactionType.ORML_TRANSFER]: <TransactionInfo tx={tx} asset={asset} />,
    [TransactionType.TRANSFER]: <TransactionInfo tx={tx} asset={asset} />,
    [TransactionType.MULTISIG_AS_MULTI]: <TransactionInfo tx={tx} asset={asset} />,

    // Staking
    [TransactionType.BOND]: <TransactionInfo tx={tx} asset={asset} />,
    [TransactionType.STAKE_MORE]: <StakeMore tx={tx} asset={asset} />,
    [TransactionType.RESTAKE]: <TransactionInfo tx={tx} asset={asset} />,
    [TransactionType.UNSTAKE]: <TransactionInfo tx={tx} asset={asset} />,
    [TransactionType.REDEEM]: null,
    [TransactionType.NOMINATE]: null,
    [TransactionType.DESTINATION]: null,

    // Technical
    [TransactionType.BATCH_ALL]: tx.args?.transactions?.[0] && <ShortTransactionInfo tx={tx.args?.transactions?.[0]} />,
    [TransactionType.CHILL]: null,
    [TransactionType.MULTISIG_APPROVE_AS_MULTI]: null,
    [TransactionType.MULTISIG_CANCEL_AS_MULTI]: null,
    [DEFAULT]: null,
  };

  return <>{Transactions[tx.type || DEFAULT]}</>;
};

export default ShortTransactionInfo;
