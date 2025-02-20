import { useStoreMap } from 'effector-react';

import { chainsService } from '@/shared/api/network';
import { type Asset, type MultisigTransaction } from '@/shared/core';
import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  operation: MultisigTransaction;
};

export const TransferOperationTitle = ({ operation }: Props) => {
  const transaction = getTransactionFromMultisigTx(operation);
  const api = useStoreMap({
    store: networkModel.$apis,
    keys: [transaction?.chainId],
    fn(apis, [chainId]) {
      return chainId ? (apis[chainId] ?? null) : null;
    },
  });
  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [transaction?.chainId],
    fn(chains, [chainId]) {
      return chainId ? (chains[chainId] ?? null) : null;
    },
  });

  let asset: Asset | null = null;

  if (transaction) {
    if (transaction.args.assetId && chain && api) {
      asset = getAssetByTypeExtras(api, chain.assets, transaction.args.assetId);
    } else {
      asset = getAssetById(transaction.args.asset, chainsService.getChainById(operation.chainId)?.assets) ?? null;
    }
  }

  const amount = transaction && getTransactionAmount(transaction);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" tx={transaction} />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
