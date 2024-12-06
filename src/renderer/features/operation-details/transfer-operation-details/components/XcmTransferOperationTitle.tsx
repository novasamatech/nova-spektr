import { chainsService } from '@/shared/api/network';
import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { getAssetById } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { XcmChains } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  operation: MultisigTransactionDS | FlexibleMultisigTransactionDS;
};

export const XcmTransferOperationTitle = ({ operation }: Props) => {
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

      <XcmChains
        chainIdFrom={operation.chainId}
        chainIdTo={operation.transaction?.args.destinationChain}
        className="w-[114px]"
      />
    </>
  );
};
