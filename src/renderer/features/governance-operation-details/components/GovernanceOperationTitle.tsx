import { chainsService } from '@/shared/api/network';
import { type MultisigTransaction } from '@/shared/core';
import { getAssetById } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  operation: MultisigTransaction;
};

export const GovernanceOperationTitle = ({ operation }: Props) => {
  const transaction = getTransactionFromMultisigTx(operation);

  const asset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(operation.chainId)?.assets);
  const amount = transaction && getTransactionAmount(transaction);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" tx={transaction} />

      {asset && amount && (
        <Box width="160px">
          <AssetBalance value={amount} asset={asset} showIcon />
        </Box>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
