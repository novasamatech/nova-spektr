import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { MultisigEvent, MultisigTransaction, SigningStatus } from '@renderer/domain/transaction';
import TransactionTitle from './TransactionTitle';
import OperationStatus from './OperationStatus';
import Chain from './Chain';
import { getExtrinsicLink, sortByDate } from '../common/utils';
import { BaseModal, FootnoteText } from '@renderer/components/ui-redesign';
import { AccountAddress } from '@renderer/components/common';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
  connection?: ExtendedChain;
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

// TODO: Return INITIATED for first approval
const getEventMessage = (event: MultisigEvent): string => {
  return EventMessage[event.status] || 'log.unknownMessage';
};

const LogModal = ({ isOpen, onClose, tx, account, connection }: Props) => {
  const { t, dateLocale } = useI18n();

  const { transaction, description, status, chainId } = tx;
  const approvals = tx.events.filter((e) => e.status === 'SIGNED');

  const groupedEvents = groupBy(tx.events, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <BaseModal title={t('log.title')} contentClass="w-[400px] p-5" closeButton isOpen={isOpen} onClose={onClose}>
      <div className="flex gap-2 items-center">
        <Chain chainId={chainId} withoutName />
        <TransactionTitle withoutIcon tx={transaction} description={description} />

        <div className="ml-auto">
          <OperationStatus status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        </div>
      </div>
      <ul>
        {Object.entries(groupedEvents)
          .sort(sortByDate<MultisigEvent>)
          .map(([date, events]) => (
            <section className="w-full mt-6" key={date}>
              <FootnoteText className="text-text-tertiary mb-3 ml-2">{date}</FootnoteText>
              <ul className="flex flex-col gap-y-1.5">
                {events
                  .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                  .map((event) => (
                    <li key={`${event.accountId}_${event.status}`}>
                      <div className="flex gap-1 w-full items-center">
                        <AccountAddress
                          address={event.accountId}
                          name={
                            account?.signatories.find((s) => s.accountId === event.accountId)?.name || event.accountId
                          }
                        />
                        {t(getEventMessage(event))}

                        <FootnoteText className="ml-auto">
                          {format(new Date(event.dateCreated || 0), 'p', { locale: dateLocale })}
                        </FootnoteText>
                      </div>

                      {getExtrinsicLink(event.extrinsicHash, connection?.explorers) && (
                        <a
                          href={getExtrinsicLink(event.extrinsicHash, connection?.explorers)}
                          className="text-primary"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('operation.explorerLink')}
                        </a>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
      </ul>
    </BaseModal>
  );
};

export default LogModal;
