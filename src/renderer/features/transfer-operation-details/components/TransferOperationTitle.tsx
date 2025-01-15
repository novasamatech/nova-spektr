import { chainsService } from '@/shared/api/network';
import { type MultisigTransaction } from '@/shared/core';
import { getAssetById } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  operation: MultisigTransaction;
};

export const TransferOperationTitle = ({ operation }: Props) => {
  const asset =
    operation.transaction &&
    getAssetById(operation.transaction.args.asset, chainsService.getChainById(operation.chainId)?.assets);
  const amount = operation.transaction && getTransactionAmount(operation.transaction);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" tx={operation.transaction} />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
