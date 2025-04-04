import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type CallData } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { nonNullable, validateCallData } from '@/shared/lib/utils';
import { Button, DetailRow, Icon, InfoLink, Separator, SmallTitleText } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation, multisigOperations } from '@/domains/network';
import { useNetworkData } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { WalletIcon, accountUtils, permissionUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';
import { OperationDetails } from './OperationDetails';
import { OperationSignatories } from './OperationSignatories';
import ApproveTxModal from './modals/ApproveTx';
import CallDataModal from './modals/CallDataModal';
import RejectTxModal from './modals/RejectTx';

type Props = {
  operation: MultisigOperation;
};

export const OperationFullInfo = memo(({ operation }: Props) => {
  const { t } = useI18n();
  const { api, chain, connection, extendedChain } = useNetworkData(operation.chainId);
  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();
  const wallets = useUnit(walletModel.$wallets);
  const selectedWallet = useUnit(walletSelect.$selectedWallet);
  const selectedAccounts = useUnit(walletSelect.$selectedAccounts);
  const account = selectedAccounts.find(accountUtils.isMultisigAccount);

  const events = operation.events;

  const explorerLink = operationDetailsUtils.getMultisigExtrinsicLink(
    operation.callHash,
    operation.indexCreated,
    operation.blockCreated,
    chain?.explorers,
  );

  const setupCallData = async (callData: CallData) => {
    if (!api || !operation) return;

    multisigOperations.updateCallData({ operation, callData });
  };

  const isRejectAvailable = wallets.some(wallet => {
    const hasDepositor = wallet.accounts?.some(account => account.accountId === operation.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet) && operation.status === 'pending';
  });

  const isFinalSigning = account && events.length === account.threshold - 1;
  const isApproveAvailable =
    !isFinalSigning || (operation.callData && validateCallData(operation.callData, operation.callHash));

  return (
    <div className="flex flex-1">
      <div className="flex w-[416px] flex-col border-r border-r-divider p-4">
        <div className="mb-4 flex items-center justify-between py-1">
          <SmallTitleText className="mr-auto">{t('operation.detailsTitle')}</SmallTitleText>

          {(!operation.transaction || explorerLink) && (
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

        <Box gap={2}>
          {nonNullable(selectedWallet) && nonNullable(account) && (
            <DetailRow label={t('operation.details.multisigWallet')}>
              <Box direction="row" gap={2}>
                <WalletIcon type={selectedWallet.type} size={16} />
                <span>{selectedWallet.name}</span>
                <AccountExplorers accountId={account.accountId} chain={chain} />
              </Box>
            </DetailRow>
          )}

          <Separator />

          {operation.transaction ? (
            <OperationDetails transaction={operation.transaction} chainId={operation.chainId} />
          ) : null}

          <OperationAdvancedDetails operation={operation} chain={chain} wallets={wallets} />
        </Box>

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

      {account && <OperationSignatories tx={operation} connection={extendedChain} account={account} />}

      <CallDataModal
        isOpen={isCallDataModalOpen}
        tx={operation}
        onSubmit={setupCallData}
        onClose={toggleCallDataModal}
      />
    </div>
  );
});
