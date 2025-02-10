import { chainsService } from '@/shared/api/network';
import { type MultisigTransaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  operation: MultisigTransaction;
};

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: 'operations.titles.unlock',
    [TransactionType.VOTE]: 'operations.titles.vote',
    [TransactionType.REVOTE]: 'operations.titles.revote',
    [TransactionType.REMOVE_VOTE]: 'operations.titles.removeVote',
    [TransactionType.DELEGATE]: 'operations.titles.delegate',
    [TransactionType.UNDELEGATE]: 'operations.titles.undelegate',
    [TransactionType.EDIT_DELEGATION]: 'operations.titles.editDelegation',
  };

  return Title[transactionType];
};

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Title: { [key in TransactionType]?: IconNames } = {
    [TransactionType.UNLOCK]: 'unlockMst',
    [TransactionType.VOTE]: 'voteMst',
    [TransactionType.REVOTE]: 'revoteMst',
    [TransactionType.REMOVE_VOTE]: 'retractMst',
    [TransactionType.DELEGATE]: 'delegateMst',
    [TransactionType.UNDELEGATE]: 'undelegateMst',
    [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
  };

  return Title[transactionType];
};

export const GovernanceOperationTitle = ({ operation }: Props) => {
  const { t } = useI18n();
  const transaction = getTransactionFromMultisigTx(operation);

  const asset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(operation.chainId)?.assets);
  const amount = transaction && getTransactionAmount(transaction);

  const title = transaction?.type && getOperationTitle(transaction?.type);
  const icon = transaction?.type && getOperationIcon(transaction?.type);

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t(title || '', { asset: asset?.symbol })}
        icon={icon}
      />

      {asset && amount && (
        <Box width="160px">
          <AssetBalance value={amount} asset={asset} showIcon />
        </Box>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
