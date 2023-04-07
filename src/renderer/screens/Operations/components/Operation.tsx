import { format } from 'date-fns';
import cn from 'classnames';
import { useEffect, useState } from 'react';

import { Address, Button, Icon, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import {
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  MultisigEvent,
  MultisigTxStatus,
} from '@renderer/domain/transaction';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import Chain from './Chain';
import ShortTransactionInfo from './ShortTransactionInfo';
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

const StatusTitle: Record<MultisigTxStatus, string> = {
  [MultisigTxInitStatus.SIGNING]: 'operation.status.signing',
  [MultisigTxFinalStatus.CANCELLED]: 'operation.status.cancelled',
  [MultisigTxFinalStatus.ERROR]: 'operation.status.error',
  [MultisigTxFinalStatus.ESTABLISHED]: 'operation.status.established',
  [MultisigTxFinalStatus.SUCCESS]: 'operation.status.success',
};

type Props = {
  tx: MultisigTransactionDS & { rowIndex: number };
  account?: MultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { dateCreated, callData, chainId, events, signatories, transaction, description, status } = tx;

  const { t, dateLocale } = useI18n();

  const { updateCallData } = useMultisigTx();
  const { connections } = useNetworkContext();
  const [isCallDataModalOpen, toggleCallDataModal] = useToggle();
  const [isRowShown, toggleRow] = useToggle();
  const [signatoriesList, setSignatories] = useState<Signatory[]>([]);

  const connection = connections[tx?.chainId as ChainId];
  const approvals = events.filter((e) => e.status === 'SIGNED');
  const cancellation = events.filter((e) => e.status === 'CANCELLED');

  const setupCallData = async (callData: CallData) => {
    const api = connection.api;

    if (!api || !tx) return;

    updateCallData(api, tx, callData as CallData);
  };

  useEffect(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = signatories.find((s) => s.publicKey === cancellation[0].signatory.publicKey);
      cancelSignatories && tempCancellation.push(cancelSignatories);
    }

    const tempApprovals = approvals
      .sort((a: MultisigEvent, b: MultisigEvent) => (a.eventBlock || 0) - (b.eventBlock || 0))
      .map((a) => signatories.find((s) => s.publicKey === a.signatory.publicKey))
      .filter(nonNullable);

    setSignatories([...new Set<Signatory>([...tempCancellation, ...tempApprovals, ...signatories])]);
  }, [signatories.length, approvals.length, cancellation.length]);

  const explorerLink = getMultisigExtrinsicLink(tx.callHash, tx.indexCreated, tx.blockCreated, connection?.explorers);

  return (
    <>
      <Table.Row className="bg-white" height="lg">
        <Table.Cell>{format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}</Table.Cell>
        <Table.Cell>
          <TransactionTitle transaction={transaction} description={description} />
        </Table.Cell>
        <Table.Cell>{transaction && <ShortTransactionInfo transaction={transaction} />}</Table.Cell>
        <Table.Cell>
          <Chain chainId={chainId} />
        </Table.Cell>
        <Table.Cell>
          {status === 'SIGNING'
            ? t('operation.signing', {
                signed: approvals.length,
                threshold: account?.threshold || 0,
              })
            : t(StatusTitle[status])}
        </Table.Cell>
        <Table.Cell>
          <Button pallet="shade" variant="text" onClick={toggleRow}>
            <Icon name={isRowShown ? 'up' : 'down'} />
          </Button>
        </Table.Cell>
      </Table.Row>
      <Table.Row className={cn('bg-shade-1', isRowShown ? 'table-row' : 'hidden')} height="lg">
        <Table.Cell className="align-top" cellAlign="width" colSpan={3}>
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
          </div>
        </Table.Cell>
        <Table.Cell className="align-top" cellAlign="width" colSpan={3}>
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
              {signatoriesList.map(({ accountId, name, publicKey }) => (
                <div className="flex justify-between" key={accountId}>
                  <Address size={20} address={accountId} name={name} canCopy />
                  {events.find((e) => e.status === 'CANCELLED' && e.signatory.publicKey === publicKey) ? (
                    <Icon className="text-error rotate-45" name="addLine" />
                  ) : (
                    events.find((e) => e.status === 'SIGNED' && e.signatory.publicKey === publicKey) && (
                      <Icon className="text-success" name="checkmarkLine" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </Table.Cell>
      </Table.Row>

      <CallDataModal isOpen={isCallDataModalOpen} tx={tx} onSubmit={setupCallData} onClose={toggleCallDataModal} />
    </>
  );
};

export default Operation;
