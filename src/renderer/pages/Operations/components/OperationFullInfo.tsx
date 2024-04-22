import { useUnit } from 'effector-react';

import { Icon, Button, InfoLink, SmallTitleText } from '@shared/ui';
import { OperationCardDetails } from './OperationCardDetails';
import RejectTx from './modals/RejectTx';
import ApproveTx from './modals/ApproveTx';
import { getMultisigExtrinsicLink } from '../common/utils';
import CallDataModal from './modals/CallDataModal';
import { useI18n, useMultisigChainContext } from '@app/providers';
import { useMultisigTx } from '@entities/multisig';
import { useToggle } from '@shared/lib/hooks';
import { MultisigTransactionDS } from '@shared/api/storage';
import type { CallData, MultisigAccount } from '@shared/core';
import { OperationSignatories } from './OperationSignatories';
import { useNetworkData } from '@entities/network';
import { walletModel, permissionUtils } from '@entities/wallet';
import { matrixModel } from '@entities/matrix';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const OperationFullInfo = ({ tx, account }: Props) => {
  const { t } = useI18n();
  const { api, chain, connection, extendedChain } = useNetworkData(tx.chainId);

  const wallets = useUnit(walletModel.$wallets);
  const matrix = useUnit(matrixModel.$matrix);

  const { addTask } = useMultisigChainContext();
  const { updateCallData } = useMultisigTx({ addTask });

  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();

  const explorerLink = getMultisigExtrinsicLink(tx.callHash, tx.indexCreated, tx.blockCreated, chain?.explorers);

  const setupCallData = async (callData: CallData) => {
    if (!api || !tx) return;

    updateCallData(api, tx, callData as CallData);

    if (!account?.matrixRoomId) return;

    matrix.sendUpdate(account?.matrixRoomId, {
      senderAccountId: tx.depositor || '0x00',
      chainId: tx.chainId,
      callHash: tx.callHash,
      callData,
      callTimepoint: {
        index: tx.indexCreated || 0,
        height: tx.blockCreated || 0,
      },
    });
  };

  const isRejectAvailable = wallets.some((wallet) => {
    const hasDepositor = wallet.accounts.some((account) => account.accountId === tx.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet);
  });

  return (
    <div className="flex flex-1">
      <div className="flex flex-col w-[416px] p-4 border-r border-r-divider">
        <div className="flex justify-between items-center mb-4 py-1">
          <SmallTitleText className="mr-auto">{t('operation.detailsTitle')}</SmallTitleText>

          {(!tx.callData || explorerLink) && (
            <div className="flex items-center">
              {!tx.callData && (
                <Button pallet="primary" variant="text" size="sm" onClick={toggleCallDataModal}>
                  {t('operation.addCallDataButton')}
                </Button>
              )}
              {explorerLink && (
                <InfoLink url={explorerLink} className="flex items-center gap-x-0.5 ml-0.5 text-footnote">
                  <span>{t('operation.explorerLink')}</span>
                  <Icon name="right" size={16} />
                </InfoLink>
              )}
            </div>
          )}
        </div>

        <OperationCardDetails tx={tx} account={account} extendedChain={extendedChain} />

        <div className="flex items-center mt-3">
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
