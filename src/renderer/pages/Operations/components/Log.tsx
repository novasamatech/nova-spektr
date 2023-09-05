import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@renderer/app/providers';
import { Account, MultisigAccount } from '@renderer/entities/account';
import { ExtendedChain } from '@renderer/entities/network';
import { MultisigEvent, SigningStatus, TransactionType } from '@renderer/entities/transaction';
import { TransactionTitle } from './TransactionTitle/TransactionTitle';
import OperationStatus from './OperationStatus';
import { getSignatoryName, sortByDateAsc } from '../common/utils';
import { BaseModal, BodyText, FootnoteText, Identicon } from '@renderer/shared/ui';
import { toAddress, SS58_DEFAULT_PREFIX } from '@renderer/shared/lib/utils';
import { ExtrinsicExplorers } from '@renderer/components/common';
import { Contact } from '@renderer/entities/contact';
import { useMultisigEvent } from '@renderer/entities/multisig';
import { MultisigTransactionDS } from '@renderer/shared/api/storage';
import { TransactionAmount } from '../components/TransactionAmount';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
  connection?: ExtendedChain;
  accounts: Account[];
  contacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
};

const EventMessage: Partial<Record<SigningStatus | 'INITIATED', string>> = {
  INITIATED: 'log.initiatedMessage',
  SIGNED: 'log.signedMessage',
  ERROR_SIGNED: 'log.errorSignedMessage',
  CANCELLED: 'log.cancelledMessage',
  ERROR_CANCELLED: 'log.errorCancelledMessage',
} as const;

const LogModal = ({ isOpen, onClose, tx, account, connection, contacts, accounts }: Props) => {
  const { t, dateLocale } = useI18n();
  const { getLiveTxEvents } = useMultisigEvent({});
  const events = getLiveTxEvents(tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated);

  const { transaction, description, status } = tx;
  const approvals = events.filter((e) => e.status === 'SIGNED');

  const addressPrefix = connection?.addressPrefix || SS58_DEFAULT_PREFIX;

  const groupedEvents = groupBy(events, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  const getEventMessage = (event: MultisigEvent): string => {
    const isCreatedEvent =
      event.accountId === tx.depositor && (event.status === 'SIGNED' || event.status === 'PENDING_SIGNED');

    const signatoryName = getSignatoryName(
      event.accountId,
      tx.signatories,
      contacts,
      accounts,
      connection?.addressPrefix,
    );
    const eventType = isCreatedEvent ? 'INITIATED' : event.status;
    const eventMessage = EventMessage[eventType] || 'log.unknownMessage';

    return `${signatoryName} ${t(eventMessage)}`;
  };

  const showTxAmount = (): boolean => {
    if (!transaction?.type) return false;

    return [
      TransactionType.TRANSFER,
      TransactionType.ORML_TRANSFER,
      TransactionType.ASSET_TRANSFER,
      TransactionType.XCM_LIMITED_TRANSFER,
      TransactionType.XCM_TELEPORT,
      TransactionType.POLKADOT_XCM_LIMITED_TRANSFER,
      TransactionType.POLKADOT_XCM_TELEPORT,
      TransactionType.XTOKENS_TRANSFER_MULTIASSET,
    ].includes(transaction.type);
  };

  return (
    <BaseModal
      title={t('log.title')}
      headerClass="border-b border-divider py-4 pl-4 pr-5"
      contentClass="p-0"
      panelClass="w-[400px]"
      closeButton
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="flex gap-2 items-center justify-between px-4 py-3">
        <TransactionTitle className="overflow-hidden" tx={transaction} description={description}>
          {transaction && showTxAmount() && (
            <TransactionAmount className="truncate" tx={transaction} showIcon={false} />
          )}
        </TransactionTitle>
        <OperationStatus
          className="shrink-0"
          status={status}
          signed={approvals.length}
          threshold={account?.threshold || 0}
        />
      </div>

      <div className="bg-main-app-background p-5 flex flex-col gap-y-4 min-h-[464px] max-h-[600px] overflow-y-scroll">
        {Object.entries(groupedEvents)
          .sort(sortByDateAsc<MultisigEvent>)
          .map(([date, events]) => (
            <section className="w-full" key={date}>
              <FootnoteText as="h4" className="text-text-tertiary mb-4">
                {date}
              </FootnoteText>

              <ul className="flex flex-col gap-y-4">
                {events
                  .sort((a, b) => (a.dateCreated || 0) - (b.dateCreated || 0))
                  .map((event) => (
                    <li key={`${event.accountId}_${event.status}`} className="flex flex-col">
                      <div className="flex gap-x-2 w-full items-center">
                        <Identicon
                          size={16}
                          address={toAddress(event.accountId, { prefix: addressPrefix })}
                          background={false}
                        />
                        <BodyText className="text-text-secondary">{getEventMessage(event)}</BodyText>
                        <BodyText className="text-text-tertiary ml-auto">
                          {event.dateCreated && format(new Date(event.dateCreated), 'p', { locale: dateLocale })}
                        </BodyText>
                        {event.extrinsicHash && connection?.explorers && (
                          <ExtrinsicExplorers hash={event.extrinsicHash} explorers={connection.explorers} />
                        )}
                      </div>

                      {(event.status === 'ERROR_CANCELLED' || event.status === 'ERROR_SIGNED') && (
                        <BodyText className="text-text-negative">{t('log.error')}</BodyText>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
      </div>
    </BaseModal>
  );
};

export default LogModal;
