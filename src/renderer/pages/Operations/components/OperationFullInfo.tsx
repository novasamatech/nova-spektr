import { useStoreMap, useUnit } from 'effector-react';

import { useMultisigChainContext } from '@/app/providers';
import { type MultisigTransactionDS } from '@/shared/api/storage';
import { type CallData, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { validateCallData } from '@/shared/lib/utils';
import { Button, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { useMultisigTx } from '@/entities/multisig';
import { useNetworkData } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { getMultisigExtrinsicLink } from '../common/utils';

import { OperationCardDetails } from './OperationCardDetails';
import { OperationSignatories } from './OperationSignatories';
import ApproveTxModal from './modals/ApproveTx';
import CallDataModal from './modals/CallDataModal';
import RejectTxModal from './modals/RejectTx';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

export const OperationFullInfo = ({ tx, account }: Props) => {
  const { t } = useI18n();
  const { api, chain, connection, extendedChain } = useNetworkData(tx.chainId);

  const wallets = useUnit(walletModel.$wallets);
  const activeWallet = useUnit(walletModel.$activeWallet);

  const events = useStoreMap({
    store: operationsModel.$multisigEvents,
    keys: [tx],
    fn: (events, [tx]) => {
      return events.filter((e) => {
        return (
          e.txAccountId === tx.accountId &&
          e.txChainId === tx.chainId &&
          e.txCallHash === tx.callHash &&
          e.txBlock === tx.blockCreated &&
          e.txIndex === tx.indexCreated &&
          e.status === 'SIGNED'
        );
      });
    },
  });

  const { addTask } = useMultisigChainContext();
  const { updateCallData } = useMultisigTx({ addTask });

  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();

  const explorerLink = getMultisigExtrinsicLink(tx.callHash, tx.indexCreated, tx.blockCreated, chain?.explorers);

  const setupCallData = async (callData: CallData) => {
    if (!api || !tx) return;

    updateCallData(api, tx, callData as CallData);
  };

  if (!walletUtils.isMultisig(activeWallet)) return null;

  const isRejectAvailable = wallets.some((wallet) => {
    const hasDepositor = wallet.accounts?.some((account) => account.accountId === tx.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet);
  });

  const isFinalSigning = events.length === activeWallet.accounts[0].threshold - 1;
  const isApproveAvailable = !isFinalSigning || (tx.callData && validateCallData(tx.callData, tx.callHash));

  return (
    <div className="flex flex-1">
      <div className="flex w-[416px] flex-col border-r border-r-divider p-4">
        <div className="mb-4 flex items-center justify-between py-1">
          <SmallTitleText className="mr-auto">{t('operation.detailsTitle')}</SmallTitleText>

          {(!tx.callData || explorerLink) && (
            <div className="flex items-center">
              {!tx.callData && (
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

        <OperationCardDetails tx={tx} account={account} extendedChain={extendedChain} />

        <div className="mt-3 flex items-center">
          {connection && isRejectAvailable && account && (
            <RejectTxModal tx={tx} account={account} connection={extendedChain}>
              <Button pallet="error" variant="fill">
                {t('operation.rejectButton')}
              </Button>
            </RejectTxModal>
          )}
          {account && isApproveAvailable && connection && (
            <ApproveTxModal tx={tx} account={account} connection={extendedChain}>
              <Button className="ml-auto">{t('operation.approveButton')}</Button>
            </ApproveTxModal>
          )}
        </div>
      </div>

      {account && <OperationSignatories tx={tx} connection={extendedChain} account={account} />}

      <CallDataModal isOpen={isCallDataModalOpen} tx={tx} onSubmit={setupCallData} onClose={toggleCallDataModal} />
    </div>
  );
};
