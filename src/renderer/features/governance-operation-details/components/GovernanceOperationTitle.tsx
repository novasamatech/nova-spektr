import { chainsService } from '@/shared/api/network';
import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { getAssetById } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
};

export const GovernanceOperationTitle = ({ tx }: Props) => {
  const asset =
    tx.transaction && getAssetById(tx.transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);
  const amount = tx.transaction && getTransactionAmount(tx.transaction);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" tx={tx.transaction} />

      {asset && amount && (
        <Box width="160px">
          <AssetBalance value={amount} asset={asset} showIcon />
        </Box>
      )}

      <ChainTitle chainId={tx.chainId} className="w-[114px]" />
    </>
  );
};
