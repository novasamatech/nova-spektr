import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import cn from 'classnames';

import { Button, ChainAddress, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { MultisigEvent } from '@renderer/domain/transaction';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import Chain from './Chain';
import TransactionTitle from './TransactionTitle';
import { useToggle } from '@renderer/shared/hooks';
import { CallData, ChainId } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { MultisigAccount } from '@renderer/domain/account';
import CallDataModal from './CallDataModal';
import Details from './Details';
import { Signatory } from '@renderer/domain/signatory';
import { nonNullable } from '@renderer/shared/utils/functions';
import { getMultisigExtrinsicLink } from '../common/utils';
import RejectTx from './RejectTx';
import ApproveTx from './ApproveTx';
import { useMatrix } from '@renderer/context/MatrixContext';
import OperationStatus from '@renderer/screens/Operations/components/OperationStatus';
import { FootnoteText } from '@renderer/components/ui-redesign';
import ShortTransactionInfo from './ShortTransactionInfo';
import { MultisigTransactionDS } from '@renderer/services/storage';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { t, dateLocale } = useI18n();
  const { matrix } = useMatrix();

  const { updateCallData } = useMultisigTx();
  const { connections } = useNetworkContext();

  const [isRowShown, toggleRow] = useToggle();
  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();
  const [signatoriesList, setSignatories] = useState<Signatory[]>([]);

  const { dateCreated, callData, chainId, events, signatories, transaction, description, status } = tx;

  const connection = connections[tx?.chainId as ChainId];
  const approvals = events.filter((e) => e.status === 'SIGNED');
  const cancellation = events.filter((e) => e.status === 'CANCELLED');

  const setupCallData = async (callData: CallData) => {
    const api = connection.api;

    if (!api || !tx) return;

    if (!account?.matrixRoomId) {
      updateCallData(api, tx, callData as CallData);

      return;
    }

    matrix.sendUpdate(account?.matrixRoomId, {
      senderAccountId: tx.depositor || '0x00',
      chainId: tx.chainId,
      callHash: tx.callHash,
      callData: callData,
      callTimepoint: {
        index: tx.indexCreated || 0,
        height: tx.blockCreated || 0,
      },
    });
  };

  useEffect(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = signatories.find((s) => s.accountId === cancellation[0].accountId);
      cancelSignatories && tempCancellation.push(cancelSignatories);
    }

    const tempApprovals = approvals
      .sort((a: MultisigEvent, b: MultisigEvent) => (a.eventBlock || 0) - (b.eventBlock || 0))
      .map((a) => signatories.find((s) => s.accountId === a.accountId))
      .filter(nonNullable);

    setSignatories([...new Set<Signatory>([...tempCancellation, ...tempApprovals, ...signatories])]);
  }, [signatories.length, approvals.length, cancellation.length]);

  const explorerLink = getMultisigExtrinsicLink(tx.callHash, tx.indexCreated, tx.blockCreated, connection?.explorers);

  return (
    <li className="flex flex-col bg-block-background-default rounded">
      {/* MAIN ROW */}
      <div className="h-[52px] pl-2.5 pr-2 grid grid-cols-operation-card items-center justify-items-start">
        <FootnoteText className="text-text-tertiary pl-3.5">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
        <TransactionTitle tx={transaction} description={description} />
        {(transaction && <ShortTransactionInfo tx={transaction} />) || <span />}
        <Chain chainId={chainId} />
        <OperationStatus status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        <Button pallet="shade" variant="text" onClick={toggleRow}>
          <Icon name={isRowShown ? 'up' : 'down'} />
        </Button>
      </div>

      {/* DETAILS */}
      <div className={cn('flex flex-1 border-t border-divider', !isRowShown && 'hidden')}>
        <div className="w-[56%]">
          <div className="flex-1 p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-2">
              <div className="font-bold text-base">{t('operation.detailsTitle')}</div>

              {callData ? (
                <a href={explorerLink} className="text-primary" target="_blank" rel="noopener noreferrer">
                  {t('operation.explorerLink')}
                </a>
              ) : (
                <Button pallet="primary" variant="text" onClick={toggleCallDataModal}>
                  {t('operation.addCallDataButton')}
                </Button>
              )}
            </div>
            {description && <div className="rounded bg-shade-5">{description}</div>}

            <Details tx={tx} account={account} connection={connection} />

            <div className="flex justify-between items-center">
              {account && connection && <RejectTx tx={tx} account={account} connection={connection} />}
              {account && connection && <ApproveTx tx={tx} account={account} connection={connection} />}
            </div>
          </div>
        </div>
        <div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-bold text-base">{t('operation.signatoriesTitle')}</div>
              <Button
                pallet="primary"
                variant="outline"
                suffixElement={<div className="bg-primary text-white rounded-full px-2">{events.length}</div>}
              >
                {t('operation.logButton')}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {signatoriesList.map(({ accountId, address, name }) => (
                <div key={accountId} className="flex justify-between">
                  <ChainAddress size={20} address={address} name={name} canCopy />

                  {events.find((e) => e.status === 'CANCELLED' && e.accountId === accountId) ? (
                    <Icon className="text-error rotate-45" name="addLine" />
                  ) : (
                    events.find((e) => e.status === 'SIGNED' && e.accountId === accountId) && (
                      <Icon className="text-success" name="checkmarkLine" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CallDataModal isOpen={isCallDataModalOpen} tx={tx} onSubmit={setupCallData} onClose={toggleCallDataModal} />
    </li>
  );
};

export default Operation;
