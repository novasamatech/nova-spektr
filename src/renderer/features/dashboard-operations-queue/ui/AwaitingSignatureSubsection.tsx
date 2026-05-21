import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { OperationTitleStatus } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { OperationActions, OperationIcon } from '@/features/multisig-operations';
import { NamedAccount } from '@/widgets/NameResolver';
import { useMultisigByAccountId } from '../model/use-multisig-by-account-id';

import { GroupedList } from './GroupedList';
import { QueueRow } from './QueueRow';
import { QueueSubsection } from './QueueSubsection';

type Props = {
  operations: MultisigOperation[];
};

export const AwaitingSignatureSubsection = ({ operations }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
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
          const account = multisigByAccountId.get(op.multisigAccountId);
          const wallet = account ? walletUtils.getWalletById(wallets, account.walletId) : undefined;
          const chain = chains[op.chainId];
          const title =
            op.section && op.method
              ? formatSectionAndMethod(op.section, op.method)
              : t('dashboard.operationsQueue.unknownOperation');

          return (
            <QueueRow
              leadingIcon={account ? <OperationIcon operation={op} account={account} /> : null}
              title={title}
              account={
                <NamedAccount
                  accountId={op.multisigAccountId}
                  chain={chain}
                  wallet={wallet}
                  iconSize={32}
                  hideExplorers
                />
              }
              chain={chain}
              status={<OperationTitleStatus operation={op} account={account ?? null} />}
              action={account ? <OperationActions operation={op} account={account} /> : null}
              onClick={() =>
                navigate(
                  multisigOperationService.generateMultisigOperationRelativeLink({
                    chainId: op.chainId,
                    callHash: op.callHash,
                    multisigAccountId: op.multisigAccountId,
                    blockCreated: op.blockCreated,
                    indexCreated: op.indexCreated,
                  }),
                )
              }
            />
          );
        }}
      />
    </QueueSubsection>
  );
};
