import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, validateCallData } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, Loader } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
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
  /**
   * Width override for the actions block. Defaults to the fixed 220px used by
   * standalone consumers (dashboard queue); table rows pass `w-full` so the
   * column governs the width.
   */
  className?: string;
};

export const OperationActions = memo(({ operation, account, className }: Props) => {
  const { t } = useI18n();
  const { api, chain } = useNetworkData(operation.chainId);
  const allAccounts = useUnit(accounts.$list);

  const isContact = isContactMultisigAccount(account);

  // An awaiting-outcome operation has already left on-chain storage — it only
  // looks pending until the indexer reports; signing it would fail on-chain.
  const isActionable = operation.status === 'pending' && !operation.awaitingOutcome;

  if (operation.status === 'pending' && operation.awaitingOutcome) {
    return (
      <div
        className={cnTw('flex w-[220px] shrink-0 items-center justify-end', className)}
        onClick={e => e.stopPropagation()}
      >
        <Tooltip>
          <Tooltip.Trigger>
            <div className="flex items-center gap-x-1.5 px-2 py-1">
              <Loader color="primary" size={14} />
              <FootnoteText className="text-text-tertiary">{t('operation.status.awaitingOutcomeLabel')}</FootnoteText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('operation.status.awaitingOutcomeDescription')}</Tooltip.Content>
        </Tooltip>
      </div>
    );
  }

  if (isContact && !isActionable) return null;

  const hasRejectAccount =
    !isContact &&
    allAccounts.some(a => {
      const isDepositor = a.accountId === operation.depositor;
      const isOnChain = chain ? accountService.isAccountAvailableOnChain(a, chain) : false;

      return isDepositor && isOnChain && !accountUtils.isWatchOnlyAccount(a);
    });

  const hasApproveAccount =
    !isContact && multisigOperationService.findActionableSignatories(operation, account, allAccounts, chain).length > 0;

  const isRejectAvailable = isActionable && hasRejectAccount;

  const isFinalSigning = operation.events.length === account.threshold - 1;
  const hasValidCallData = operation.callData && validateCallData(operation.callData, operation.callHash);
  const isApproveAvailable = isActionable && hasApproveAccount && (!isFinalSigning || hasValidCallData);

  const needsCallData = isActionable && hasApproveAccount && isFinalSigning && !hasValidCallData;

  // The user's own signatories — the ones a "Signed" state would be about. Watch-only
  // accounts can never sign, so owning one is not owning a signatory.
  const approvedBy = multisigOperationService.getApprovers(operation);
  const ownSignatories = account.signatories.filter(signatory =>
    allAccounts.some(
      a => !accountUtils.isWatchOnlyAccount(a) && multisigOperationService.accountMatchesSignatory(a, signatory),
    ),
  );
  const hasSignedWithAllOwn = ownSignatories.length > 0 && ownSignatories.every(s => approvedBy.has(s.accountId));
  // Nothing left to approve because the user already did — say so instead of leaving a blank cell.
  const isSignedByUser = !isContact && isActionable && !isApproveAvailable && !needsCallData && hasSignedWithAllOwn;

  if (!chain && !isContact) return null;

  if (isContact) {
    return (
      <div className={cnTw('flex w-[220px] shrink-0', className)} onClick={e => e.stopPropagation()}>
        <WalletPairingOperationTrigger tooltipContent={t('operation.addWalletTooltipMultisig')} />
      </div>
    );
  }

  return (
    <div className={cnTw('grid w-[220px] shrink-0 grid-cols-2 gap-x-2', className)} onClick={e => e.stopPropagation()}>
      <div className="flex min-w-0">
        {api && chain && isRejectAvailable && (
          <RejectTxModal api={api} operation={operation} account={account} chain={chain}>
            <Button pallet="error" variant="fill" size="sm" className="w-full min-w-0 truncate whitespace-nowrap">
              {t('operation.rejectButton')}
            </Button>
          </RejectTxModal>
        )}
      </div>
      <div className="flex min-w-0">
        {api && chain && isApproveAvailable && (
          <ApproveTxModal api={api} operation={operation} account={account} chain={chain}>
            <Button size="sm" className="w-full min-w-0 truncate whitespace-nowrap">
              {t('operation.approveButton')}
            </Button>
          </ApproveTxModal>
        )}
        {isSignedByUser && (
          <Tooltip>
            <Tooltip.Trigger>
              <div
                role="status"
                className="inline-flex h-7 w-full items-center justify-center gap-x-1 rounded-full bg-badge-green-background-default px-3 text-button-small text-text-positive"
              >
                <Icon name="checkmarkOutline" size={14} className="text-icon-positive" />
                {t('operation.signedButton')}
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('operation.signedTooltip')}</Tooltip.Content>
          </Tooltip>
        )}
        {api && chain && needsCallData && (
          <CallDataModal api={api} operation={operation} chain={chain}>
            <Button size="sm" variant="chip" className="w-full min-w-0 truncate whitespace-nowrap">
              {t('operation.callData.addCallDataButton')}
            </Button>
          </CallDataModal>
        )}
      </div>
    </div>
  );
});
