import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type CallData, type MultisigAccount } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { validateCallData } from '@/shared/lib/utils';
import { Button, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, multisigOperation } from '@/domains/network';
import { useNetworkData } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { permissionUtils, walletModel, walletUtils } from '@/entities/wallet';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';
import { OperationDetails } from './OperationDetails';
import { OperationSignatories } from './OperationSignatories';
import ApproveTxModal from './modals/ApproveTx';
import CallDataModal from './modals/CallDataModal';
import RejectTxModal from './modals/RejectTx';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | null;
};

type SlotProps = {
  operation: MultisigOperation;
};

export const operationDetailsSlot = createSlot<SlotProps>();

export const OperationFullInfo = memo(({ operation, account }: Props) => {
  const { t } = useI18n();
  const { api, chain, connection, extendedChain } = useNetworkData(operation.chainId);

  const wallets = useUnit(walletModel.$wallets);
  const activeWallet = useUnit(walletModel.$activeWallet);

  const events = operation.events;

  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();

  const explorerLink = operationDetailsUtils.getMultisigExtrinsicLink(
    operation.callHash,
    operation.indexCreated,
    operation.blockCreated,
    chain?.explorers,
  );

  const setupCallData = async (callData: CallData) => {
    if (!operation) return;

    multisigOperation.updateCallData({ operation, callData });
  };

  const isRejectAvailable = wallets.some(wallet => {
    const hasDepositor = wallet.accounts?.some(account => account.accountId === operation.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet) && operation.status === 'pending';
  });

  if (!walletUtils.isMultisig(activeWallet)) return null;

  const isFinalSigning = account && events.length === account.threshold - 1;
  const isApproveAvailable =
    !isFinalSigning || (operation.callData && validateCallData(operation.callData, operation.callHash));

  return (
    <div className="flex flex-1">
      <div className="flex w-[416px] flex-col border-r border-r-divider p-4">
        <div className="mb-4 flex items-center justify-between py-1">
          <SmallTitleText className="mr-auto">{t('operation.detailsTitle')}</SmallTitleText>

          {(!operation.callData || explorerLink) && (
            <div className="flex items-center">
              {!operation.callData && (
                <Button pallet="primary" variant="text" size="sm" onClick={toggleCallDataModal}>
                  {t('operation.addCallDataButton')}
                </Button>
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

        <div className="flex w-full flex-col gap-y-1">
          <OperationDetails operation={operation} />

          <Slot id={operationDetailsSlot} props={{ operation: operation }} />

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
