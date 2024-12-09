import { useUnit } from 'effector-react';

import { useMultisigChainContext } from '@/app/providers';
import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { type CallData, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { useMultisigTx } from '@/entities/multisig';
import { useNetworkData } from '@/entities/network';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { multisigOperationsFeature } from '@/features/multisig-operations';
import { getMultisigExtrinsicLink } from '../common/utils';

import { OperationSignatories } from './OperationSignatories';
import ApproveTxModal from './modals/ApproveTx';
import CallDataModal from './modals/CallDataModal';
import RejectTxModal from './modals/RejectTx';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  account?: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationFullInfo = ({ tx, account }: Props) => {
  const { t } = useI18n();
  const { api, chain, connection, extendedChain } = useNetworkData(tx.chainId);

  const wallets = useUnit(walletModel.$wallets);

  const { addTask } = useMultisigChainContext();
  const { updateCallData } = useMultisigTx({ addTask });

  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();

  const explorerLink = getMultisigExtrinsicLink(tx.callHash, tx.indexCreated, tx.blockCreated, chain?.explorers);

  const setupCallData = async (callData: CallData) => {
    if (!api || !tx) return;

    updateCallData(api, tx, callData as CallData);
  };

  const isRejectAvailable = wallets.some((wallet) => {
    const hasDepositor = wallet.accounts.some((account) => account.accountId === tx.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet);
  });

  const operationDetails = useSlot(multisigOperationsFeature.slots.operationDetails, {
    props: {
      operation: tx,
    },
  });

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

        <div className="flex w-full flex-col gap-y-1">{operationDetails}</div>

        <div className="mt-3 flex items-center">
          {connection && isRejectAvailable && account && (
            <RejectTxModal tx={tx} account={account} connection={extendedChain}>
              <Button pallet="error" variant="fill">
                {t('operation.rejectButton')}
              </Button>
            </RejectTxModal>
          )}
          {account && connection && (
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
