import { chainsService } from '@/shared/api/network';
import { type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  title: string;
  icon?: IconNames;
  operation: MultisigTransaction;
};

export const StakingOperationTitle = ({ operation, title, icon }: Props) => {
  const { t } = useI18n();
  const transaction = getTransactionFromMultisigTx(operation);

  const asset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(operation.chainId)?.assets);
  const amount = transaction && getTransactionAmount(transaction);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={t(title || '')} icon={icon} />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
