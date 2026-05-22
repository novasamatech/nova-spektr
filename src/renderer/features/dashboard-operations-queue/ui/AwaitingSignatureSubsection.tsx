import { useUnit } from 'effector-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { type Chain, type FlexibleMultisigAccount, type MultisigAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { OperationTitleStatus } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import {
  OperationActions,
  OperationAmount,
  OperationIcon,
  extractTransferAmount,
} from '@/features/multisig-operations';
import { AccountName } from '@/widgets/NameResolver';
import { useMultisigByAccountId } from '../model/use-multisig-by-account-id';

import { GroupedList } from './GroupedList';
import { QueueRow } from './QueueRow';
import { QueueSubsection } from './QueueSubsection';

type Props = {
  operations: MultisigOperation[];
};

type MultisigLike = MultisigAccount | FlexibleMultisigAccount;

export const AwaitingSignatureSubsection = ({ operations }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const multisigByAccountId = useMultisigByAccountId();

  return (
    <QueueSubsection title={t('dashboard.operationsQueue.awaitingSignature')} count={operations.length} tone="negative">
      <GroupedList
        items={operations}
        getKey={(op) => op.id}
        getTimestamp={multisigOperationService.getOperationTimestamp}
        renderItem={(op) => {
          const account = multisigByAccountId.get(op.multisigAccountId) ?? null;
          const wallet = account ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;
          return <AwaitingQueueRow operation={op} chain={chains[op.chainId]} account={account} wallet={wallet} />;
        }}
      />
    </QueueSubsection>
  );
};

type AwaitingQueueRowProps = {
  operation: MultisigOperation;
  chain: Chain | undefined;
  account: MultisigLike | null;
  wallet: Wallet | null;
};

const AwaitingQueueRow = ({ operation, chain, account, wallet }: AwaitingQueueRowProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const description = useOperationDescription(operation.id);

  const title =
    operation.section && operation.method
      ? formatSectionAndMethod(operation.section, operation.method)
      : t('dashboard.operationsQueue.unknownOperation');
  const transferAmount = useMemo(() => (chain ? extractTransferAmount(operation, chain) : null), [operation, chain]);

  return (
    <QueueRow
      leadingIcon={account ? <OperationIcon operation={operation} account={account} /> : null}
      title={title}
      chain={chain}
      subtitle={<AccountName accountId={operation.multisigAccountId} chain={chain} wallet={wallet} />}
      description={description}
      value={
        transferAmount ? (
          <OperationAmount value={transferAmount.rawAmount} asset={transferAmount.asset} iconSize={28} />
        ) : null
      }
      status={<OperationTitleStatus operation={operation} account={account ?? null} />}
      action={account ? <OperationActions operation={operation} account={account} /> : null}
      onClick={() =>
        navigate(
          multisigOperationService.generateMultisigOperationRelativeLink({
            chainId: operation.chainId,
            callHash: operation.callHash,
            multisigAccountId: operation.multisigAccountId,
            blockCreated: operation.blockCreated,
            indexCreated: operation.indexCreated,
          }),
        )
      }
    />
  );
};
