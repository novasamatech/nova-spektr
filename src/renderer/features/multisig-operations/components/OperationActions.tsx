import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { validateCallData } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { type MultisigOperation, accountService, accounts } from '@/domains/network';
import { useNetworkData } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

import { ApproveTxModal } from './modals/ApproveTx';
import { RejectTxModal } from './modals/RejectTx';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationActions = memo(({ operation, account }: Props) => {
  const { t } = useI18n();
  const { api, chain } = useNetworkData(operation.chainId);
  const allAccounts = useUnit(accounts.$list);

  const hasRejectAccount = allAccounts.some(a => {
    return a.accountId === operation.depositor && !accountUtils.isWatchOnlyAccount(a);
  });

  const hasApproveAccount = allAccounts.some(a => {
    const isSignatory = account.signatories.some(
      s => s.accountId === a.accountId && (s.id ? s.id === a.walletId : true),
    );
    const isOnChain = chain ? accountService.isAccountAvailableOnChain(a, chain) : false;
    const hasNotSigned = !operation.events.some(e => e.accountId === a.accountId);

    return isSignatory && isOnChain && hasNotSigned && !accountUtils.isWatchOnlyAccount(a);
  });

  const isRejectAvailable = operation.status === 'pending' && hasRejectAccount;

  const isFinalSigning = account && operation.events.length === account.threshold - 1;
  const isApproveAvailable =
    operation.status === 'pending' &&
    hasApproveAccount &&
    (!isFinalSigning || (operation.callData && validateCallData(operation.callData, operation.callHash)));

  if (!chain) return null;

  return (
    <div className="flex w-[140px] shrink-0 gap-x-2" onClick={e => e.stopPropagation()}>
      {api && chain && isRejectAvailable && (
        <RejectTxModal api={api} operation={operation} account={account} chain={chain}>
          <Button pallet="error" variant="fill" size="sm" className="flex-1">
            {t('operation.rejectButton')}
          </Button>
        </RejectTxModal>
      )}
      {api && chain && isApproveAvailable && (
        <ApproveTxModal api={api} operation={operation} account={account} chain={chain}>
          <Button size="sm" className="flex-1">
            {t('operation.approveButton')}
          </Button>
        </ApproveTxModal>
      )}
    </div>
  );
});
