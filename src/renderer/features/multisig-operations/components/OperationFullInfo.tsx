import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type CallData, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { validateCallData } from '@/shared/lib/utils';
import { Button, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { Box, Json, Modal } from '@/shared/ui-kit';
import { type MultisigOperation, accounts, multisigOperation } from '@/domains/network';
import { useNetworkData } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';
import { OperationDetails } from './OperationDetails';
import { OperationSignatories } from './OperationSignatories';
import { ApproveTxModal } from './modals/ApproveTx';
import { CallDataModal } from './modals/CallDataModal';
import { RejectTxModal } from './modals/RejectTx';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

type SlotProps = {
  operation: MultisigOperation;
  showCoreTransaction?: boolean;
};

export const operationDetailsSlot = createSlot<SlotProps>();

export const OperationFullInfo = memo(({ operation, account }: Props) => {
  const { t } = useI18n();
  const { api, chain, connection, extendedChain } = useNetworkData(operation.chainId);
  const allAccounts = useUnit(accounts.$list);
  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();

  const explorerLink = operationDetailsUtils.getMultisigExtrinsicLink(
    operation.callHash,
    operation.indexCreated,
    operation.blockCreated,
    chain?.explorers,
  );

  const jsonArgs = useMemo(() => {
    if (!operation.callData || !api || !chain) return null;

    const call = transactionService.createCallFromCallData(operation.callData, api);
    if (!call) return null;

    return transactionService.formatCall(call, chain);
  }, [api, operation.callData, chain]);

  const hasAccount = allAccounts.some(a => {
    return a.accountId === operation.depositor && !accountUtils.isWatchOnlyAccount(a);
  });

  const isRejectAvailable = operation.status === 'pending' && hasAccount;

  const isFinalSigning = account && operation.events.length === account.threshold - 1;
  const isApproveAvailable =
    !isFinalSigning || (operation.callData && validateCallData(operation.callData, operation.callHash));

  const setupCallData = (callData: CallData) => {
    multisigOperation.updateCallData({ operation, callData });
  };

  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);

  return (
    <div className="flex flex-1">
      <div className="flex w-[416px] flex-col border-r border-r-divider p-4">
        <div className="mb-4 flex items-center justify-between py-1">
          <SmallTitleText className="mr-auto">{t('operation.detailsTitle')}</SmallTitleText>

          {(!operation.callData || explorerLink) && (
            <div className="flex items-center gap-4">
              {!operation.callData && (
                <Button pallet="primary" variant="text" size="sm" onClick={toggleCallDataModal}>
                  {t('operation.addCallDataButton')}
                </Button>
              )}

              {jsonArgs && (
                <Modal size="lg" height="fit">
                  <Modal.Trigger>
                    <Button className="p-0" size="sm" variant="text">
                      {t('operation.viewJSON.button')}
                    </Button>
                  </Modal.Trigger>
                  <Modal.Title close>{t('operation.viewJSON.label')}</Modal.Title>
                  <Modal.Content>
                    <Box padding={5}>
                      <Json value={jsonArgs} name="operation" />
                    </Box>
                  </Modal.Content>
                </Modal>
              )}

              {explorerLink && (
                <InfoLink url={explorerLink} className="ml-0.5 flex items-center gap-x-0.5 text-footnote">
                  <span>{t('operation.explorerLink')}</span>
                  <Icon name="right" size={16} />
                </InfoLink>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full flex-1 flex-col gap-y-1">
          <OperationDetails operation={operation} />

          <Slot id={operationDetailsSlot} props={{ operation, showCoreTransaction }} />

          <OperationAdvancedDetails operation={operation} />
        </div>

        <div className="mt-3 flex items-center">
          {connection && isRejectAvailable && account && (
            <RejectTxModal api={api} operation={operation} account={account} chain={chain}>
              <Button pallet="error" variant="fill">
                {t('operation.rejectButton')}
              </Button>
            </RejectTxModal>
          )}
          {account && isApproveAvailable && connection && (
            <ApproveTxModal api={api} operation={operation} account={account} chain={chain}>
              <Button className="ml-auto">{t('operation.approveButton')}</Button>
            </ApproveTxModal>
          )}
        </div>
      </div>

      {account && <OperationSignatories operation={operation} connection={extendedChain} account={account} />}

      <CallDataModal
        isOpen={isCallDataModalOpen}
        operation={operation}
        onSubmit={setupCallData}
        onClose={toggleCallDataModal}
      />
    </div>
  );
});
