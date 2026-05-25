import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { validateCallData } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import {
  type MultisigOperation,
  accountService,
  accounts,
  isContactMultisigAccount,
  multisigOperationService,
} from '@/domains/network';
import { useNetworkData } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { WalletPairingOperationTrigger } from '@/features/wallet-pairing';

import { ApproveTxModal } from './modals/ApproveTx';
import { CallDataModal } from './modals/CallDataModal';
import { RejectTxModal } from './modals/RejectTx';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationActions = memo(({ operation, account }: Props) => {
  const { t } = useI18n();
  const { api, chain } = useNetworkData(operation.chainId);
  const allAccounts = useUnit(accounts.$list);

  const isContact = isContactMultisigAccount(account);

  if (isContact && operation.status !== 'pending') return null;

  const hasRejectAccount =
    !isContact &&
    allAccounts.some(a => {
      const isDepositor = a.accountId === operation.depositor;
      const isOnChain = chain ? accountService.isAccountAvailableOnChain(a, chain) : false;

      return isDepositor && isOnChain && !accountUtils.isWatchOnlyAccount(a);
    });

  const hasApproveAccount =
    !isContact && multisigOperationService.findActionableSignatories(operation, account, allAccounts, chain).length > 0;

  const isRejectAvailable = operation.status === 'pending' && hasRejectAccount;

  const isFinalSigning = operation.events.length === account.threshold - 1;
  const hasValidCallData = operation.callData && validateCallData(operation.callData, operation.callHash);
  const isApproveAvailable =
    operation.status === 'pending' && hasApproveAccount && (!isFinalSigning || hasValidCallData);

  const needsCallData = operation.status === 'pending' && hasApproveAccount && isFinalSigning && !hasValidCallData;

  if (!chain && !isContact) return null;

  if (isContact) {
    return (
      <div className="flex w-[220px] shrink-0" onClick={e => e.stopPropagation()}>
        <WalletPairingOperationTrigger tooltipContent={t('operation.addWalletTooltipMultisig')} />
      </div>
    );
  }

  return (
    <div className="grid w-[220px] shrink-0 grid-cols-2 gap-x-2" onClick={e => e.stopPropagation()}>
      <div className="flex">
        {api && chain && isRejectAvailable && (
          <RejectTxModal api={api} operation={operation} account={account} chain={chain}>
            <Button pallet="error" variant="fill" size="sm" className="w-full">
              {t('operation.rejectButton')}
            </Button>
          </RejectTxModal>
        )}
      </div>
      <div className="flex">
        {api && chain && isApproveAvailable && (
          <ApproveTxModal api={api} operation={operation} account={account} chain={chain}>
            <Button size="sm" className="w-full">
              {t('operation.approveButton')}
            </Button>
          </ApproveTxModal>
        )}
        {api && chain && needsCallData && (
          <CallDataModal api={api} operation={operation} chain={chain}>
            <Button size="sm" variant="chip" className="w-full whitespace-nowrap">
              {t('operation.callData.addCallDataButton')}
            </Button>
          </CallDataModal>
        )}
      </div>
    </div>
  );
});
