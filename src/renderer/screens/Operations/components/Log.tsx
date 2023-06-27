import { groupBy } from 'lodash';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { MultisigEvent, MultisigTransaction, SigningStatus } from '@renderer/domain/transaction';
import TransactionTitle from './TransactionTitle/TransactionTitle';
import OperationStatus from './OperationStatus';
import { getTransactionAmount, sortByDateAsc } from '../common/utils';
import { AssetIcon, BaseModal, BodyText, FootnoteText } from '@renderer/components/ui-redesign';
import { useChains } from '@renderer/services/network/chainsService';
import { getAssetById } from '@renderer/shared/utils/assets';
import { Identicon } from '@renderer/components/ui';
import { toAddress } from '@renderer/shared/utils/address';
import { Chain } from '@renderer/domain/chain';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';
import { ExtrinsicExplorers } from '@renderer/components/common';
import { AccountId } from '@renderer/domain/shared-kernel';
import { useContact } from '@renderer/services/contact/contactService';
import { useAccount } from '@renderer/services/account/accountService';

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

const LogModal = ({ isOpen, onClose, tx, account, connection }: Props) => {
  const { t, dateLocale } = useI18n();
  const { getChainById } = useChains();
  const { getLiveContacts } = useContact();
  const { getLiveAccounts } = useAccount();

  const [chain, setChain] = useState<Chain>();

  const contacts = getLiveContacts();
  const accounts = getLiveAccounts();

  useEffect(() => {
    getChainById(tx.chainId).then((chain) => setChain(chain));
  }, []);

  const { transaction, description, status } = tx;
  const approvals = tx.events.filter((e) => e.status === 'SIGNED');

  const asset = getAssetById(transaction?.args.assetId, chain?.assets);
  const addressPrefix = chain?.addressPrefix || SS58_DEFAULT_PREFIX;
  const showAsset = Boolean(transaction && getTransactionAmount(transaction));

  const groupedEvents = groupBy(tx.events, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  const getSignatory = (accountId: AccountId): { name?: string; accountId?: AccountId } | undefined => {
    const fromSignatory = account?.signatories.find((s) => s.accountId === accountId);
    const fromAccount = accounts.find((a) => a.accountId === accountId);
    const fromContact = contacts.find((c) => c.accountId === accountId);

    return fromSignatory || fromAccount || fromContact;
  };

  const getEventMessage = (event: MultisigEvent): string => {
    const signatory = getSignatory(event.accountId);
    const isCreatedEvent =
      signatory?.accountId === tx.depositor && (event.status === 'SIGNED' || event.status === 'PENDING_SIGNED');

    const signatoryName = signatory?.name || toAddress(event.accountId, { chunk: 5, prefix: chain?.addressPrefix });
    const eventType = isCreatedEvent ? 'INITIATED' : event.status;
    const eventMessage = EventMessage[eventType] || 'log.unknownMessage';

    return `${signatoryName} ${t(eventMessage)}`;
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
      <div className="flex gap-2 items-center px-4 py-3">
        {showAsset && <AssetIcon name={asset?.name} src={asset?.icon} />}
        <TransactionTitle withoutIcon tx={transaction} description={description} />

        <div className="ml-auto">
          <OperationStatus status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        </div>
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
