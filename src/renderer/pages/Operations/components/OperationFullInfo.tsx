import { useUnit } from 'effector-react';

import { useI18n, useMultisigChainContext } from '@app/providers';
import { type MultisigTransactionDS } from '@shared/api/storage';
import { type CallData, type MultisigAccount } from '@shared/core';
import { useToggle } from '@shared/lib/hooks';
import { Button, Icon, InfoLink, SmallTitleText } from '@shared/ui';
import { useMultisigTx } from '@entities/multisig';
import { useNetworkData } from '@entities/network';
import { permissionUtils, walletModel } from '@entities/wallet';
import { getMultisigExtrinsicLink } from '../common/utils';

import { OperationCardDetails } from './OperationCardDetails';
import { OperationSignatories } from './OperationSignatories';
import ApproveTx from './modals/ApproveTx';
import CallDataModal from './modals/CallDataModal';
import RejectTx from './modals/RejectTx';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const OperationFullInfo = ({ tx, account }: Props) => {
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
            <RejectTx tx={tx} account={account} connection={extendedChain} />
          )}
          {account && connection && <ApproveTx tx={tx} account={account} connection={extendedChain} />}
        </div>
      </div>

      {account && <OperationSignatories tx={tx} connection={extendedChain} account={account} />}

      <CallDataModal isOpen={isCallDataModalOpen} tx={tx} onSubmit={setupCallData} onClose={toggleCallDataModal} />
    </div>
  );
};

export default OperationFullInfo;
