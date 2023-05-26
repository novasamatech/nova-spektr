import { groupBy } from 'lodash';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { MultisigEvent, MultisigTransaction, SigningStatus } from '@renderer/domain/transaction';
import TransactionTitle from './TransactionTitle/TransactionTitle';
import OperationStatus from './OperationStatus';
import { getExtrinsicLink, getTransactionAmount, sortByDate } from '../common/utils';
import { BaseModal, BodyText, FootnoteText, InfoLink } from '@renderer/components/ui-redesign';
import { useChains } from '@renderer/services/network/chainsService';
import { getAssetById, getIconVariant } from '@renderer/shared/utils/assets';
import { Icon, Identicon } from '@renderer/components/ui';
import { toAddress } from '@renderer/shared/utils/address';
import { Chain } from '@renderer/domain/chain';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';

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
  const { getChainById } = useChains();
  const [chain, setChain] = useState<Chain>();

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
        {showAsset && (
          <img
            src={getIconVariant(asset?.icon || '', 'alternative')}
            alt={asset?.name}
            className="rounded-full border border-token-container-border w-9 h-9"
          />
        )}
        <TransactionTitle withoutIcon tx={transaction} description={description} />

        <div className="ml-auto">
          <OperationStatus status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        </div>
      </div>

      <div className="bg-main-app-background p-5 flex flex-col gap-y-4 min-h-[464px]">
        {Object.entries(groupedEvents)
          .sort(sortByDate<MultisigEvent>)
          .map(([date, events]) => (
            <section className="w-full" key={date}>
              <FootnoteText as="h4" className="text-text-tertiary mb-4">
                {date}
              </FootnoteText>

              <ul className="flex flex-col gap-y-4">
                {events
                  .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                  .map((event) => (
                    <li key={`${event.accountId}_${event.status}`} className="flex flex-col">
                      <div className="flex gap-x-2 w-full items-center">
                        <Identicon
                          size={16}
                          address={toAddress(event.accountId, { prefix: addressPrefix })}
                          background={false}
                        />
                        <BodyText className="text-text-secondary">
                          {account?.signatories.find((s) => s.accountId === event.accountId)?.name}{' '}
                          {t(getEventMessage(event))}
                        </BodyText>
                        <BodyText className="text-text-tertiary ml-auto">
                          {event.dateCreated && format(new Date(event.dateCreated), 'p', { locale: dateLocale })}
                        </BodyText>
                      </div>

                      {getExtrinsicLink(event.extrinsicHash, connection?.explorers) && (
                        <InfoLink
                          url={getExtrinsicLink(event.extrinsicHash, connection?.explorers)!}
                          className="flex items-center gap-x-0.5 ml-4 text-footnote font-medium font-inter"
                        >
                          <span>{t('operation.explorerLink')}</span>
                          <Icon name="right" size={16} />
                        </InfoLink>
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
