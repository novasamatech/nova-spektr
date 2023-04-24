import { useEffect, useState } from 'react';

import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { DEFAULT } from '@shared/constants/common';
import { useChains } from '@renderer/services/network/chainsService';
import { Asset } from '@renderer/domain/asset';
import { getAssetById } from '@renderer/shared/utils/assets';
import TokenBalance from '@renderer/components/common/TokenBalance/TokenBalance';

type Props = {
  tx: Transaction;
};

const ShortTransactionInfo = ({ tx }: Props) => {
  const { getChainById } = useChains();
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    getChainById(tx.chainId).then((chain) => setAssets(chain?.assets || []));
  }, []);

  const asset = getAssetById(tx.args.assetId, assets);

  const getInfoByTxType = () => {
    const type = tx.type || DEFAULT;

    if (asset) {
      if (
        [
          TransactionType.ASSET_TRANSFER,
          TransactionType.ORML_TRANSFER,
          TransactionType.TRANSFER,
          TransactionType.MULTISIG_AS_MULTI,
          TransactionType.BOND,
          TransactionType.RESTAKE,
          TransactionType.UNSTAKE,
        ].includes(type)
      ) {
        return <TokenBalance value={tx.args.value} asset={asset} />;
      }
      if (type === TransactionType.STAKE_MORE) {
        return <TokenBalance value={tx.args.maxAdditional} asset={asset} />;
      }
    }

    if (type === TransactionType.BATCH_ALL) {
      return <ShortTransactionInfo tx={tx.args?.calls?.[0]} />;
    }

    return null;
  };

  return <>{getInfoByTxType()}</>;
};

export default ShortTransactionInfo;
