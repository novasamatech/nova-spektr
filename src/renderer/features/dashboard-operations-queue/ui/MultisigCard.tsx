import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, validateCallData } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { networkModel, useNetworkData } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { ApproveTxModal, CallDataModal, OperationIcon } from '@/features/multisig-operations';
import { NamedAccount } from '@/widgets/NameResolver';
import { useMultisigByAccountId } from '../model/use-multisig-by-account-id';

import { OperationCardShell } from './OperationCardShell';

type Props = {
  operation: MultisigOperation;
  onSkip: () => void;
};

export const MultisigCard = ({ operation, onSkip }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const multisigByAccountId = useMultisigByAccountId();
  const { api, chain } = useNetworkData(operation.chainId);
  const description = useOperationDescription(operation.id);

  const chainMeta: Chain | undefined = chains[operation.chainId];
  const account = multisigByAccountId.get(operation.multisigAccountId) ?? null;
  const wallet = account ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;

  const title =
    operation.section && operation.method
      ? formatSectionAndMethod(operation.section, operation.method)
      : t('dashboard.operationsQueue.unknownOperation');

  // filterAwaitingSignature already guaranteed pending + actionable signatory.
  const isFinalSigning = account ? operation.events.length === account.threshold - 1 : false;
  const hasValidCallData = Boolean(operation.callData && validateCallData(operation.callData, operation.callHash));
  const needsCallData = isFinalSigning && !hasValidCallData;
  const canApprove = !isFinalSigning || hasValidCallData;

  const skipButton = (
    <Button size="sm" variant="text" onClick={onSkip}>
      {t('dashboard.operationsQueue.skip')}
    </Button>
  );

  let actionButton: ReactNode = null;
  if (account && api && chain) {
    if (canApprove) {
      actionButton = (
        <ApproveTxModal api={api} operation={operation} account={account} chain={chain}>
          <Button size="sm" className="w-full">
            {t('operation.approveButton')}
          </Button>
        </ApproveTxModal>
      );
    } else if (needsCallData) {
      actionButton = (
        <CallDataModal api={api} operation={operation} chain={chain}>
          <Button size="sm" variant="chip" className="w-full whitespace-nowrap">
            {t('operation.callData.addCallDataButton')}
          </Button>
        </CallDataModal>
      );
    }
  }

  return (
    <OperationCardShell
      leadingIcon={account ? <OperationIcon operation={operation} account={account} /> : null}
      title={title}
      chain={chainMeta}
      metaLabel={t('dashboard.operationsQueue.approveBadge')}
      accountSlot={
        <NamedAccount
          accountId={operation.multisigAccountId}
          chain={chainMeta}
          wallet={wallet}
          iconSize={20}
          hideExplorers
          variant="short"
        />
      }
      description={description}
      skipButton={skipButton}
      actionButton={actionButton}
    />
  );
};
