import { Icon, Button, InfoLink, SmallTitleText } from '@renderer/shared/ui';
import Details from '@renderer/pages/Operations/components/Details';
import RejectTx from '@renderer/pages/Operations/components/modals/RejectTx';
import ApproveTx from '@renderer/pages/Operations/components/modals/ApproveTx';
import { getMultisigExtrinsicLink } from '@renderer/pages/Operations/common/utils';
import CallDataModal from '@renderer/pages/Operations/components/modals/CallDataModal';
import { useMatrix, useNetworkContext, useI18n, useMultisigChainContext } from '@renderer/app/providers';
import { useMultisigTx } from '@renderer/entities/multisig';
import { useToggle } from '@renderer/shared/lib/hooks';
import { MultisigTransactionDS } from '@renderer/shared/api/storage';
import type { CallData, ChainId, MultisigAccount } from '@renderer/shared/core';
import { OperationSignatories } from './OperationSignatories';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const OperationFullInfo = ({ tx, account }: Props) => {
  const { t } = useI18n();

  const callData = tx.callData;

  const { matrix } = useMatrix();

  const { addTask } = useMultisigChainContext();
  const { updateCallData } = useMultisigTx({ addTask });
  const { connections } = useNetworkContext();
  const connection = connections[tx?.chainId as ChainId];

  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();

  const explorerLink = getMultisigExtrinsicLink(tx.callHash, tx.indexCreated, tx.blockCreated, connection?.explorers);

  const setupCallData = async (callData: CallData) => {
    const api = connection.api;

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

  return (
    <div className="flex flex-1">
      <div className="flex flex-col w-[416px] p-4 border-r border-r-divider">
        <div className="flex justify-between items-center mb-4 py-1">
          <SmallTitleText className="mr-auto">{t('operation.detailsTitle')}</SmallTitleText>

          {(!callData || explorerLink) && (
            <div className="flex items-center">
              {!callData && (
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

        <Details tx={tx} account={account} connection={connection} />

        <div className="flex items-center mt-3">
          {account && connection && <RejectTx tx={tx} account={account} connection={connection} />}
          {account && connection && <ApproveTx tx={tx} account={account} connection={connection} />}
        </div>
      </div>

      {account && <OperationSignatories tx={tx} connection={connection} account={account} />}

      <CallDataModal isOpen={isCallDataModalOpen} tx={tx} onSubmit={setupCallData} onClose={toggleCallDataModal} />
    </div>
  );
};

export default OperationFullInfo;
