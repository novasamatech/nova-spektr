import { groupBy } from 'lodash';
import { format } from 'date-fns';
import { useUnit } from 'effector-react';

import { useI18n } from '@renderer/app/providers';
import { chainsService, ExtendedChain } from '@renderer/entities/network';
import { MultisigEvent, SigningStatus } from '@renderer/entities/transaction/model/transaction';
import { TransactionTitle } from './TransactionTitle/TransactionTitle';
import OperationStatus from './OperationStatus';
import { getSignatoryName, getTransactionAmount, sortByDateAsc } from '../common/utils';
import { BaseModal, BodyText, FootnoteText, Identicon } from '@renderer/shared/ui';
import { getAssetById, SS58_DEFAULT_PREFIX, toAddress } from '@renderer/shared/lib/utils';
import { ExtrinsicExplorers } from '@renderer/components/common';
import { useMultisigEvent } from '@renderer/entities/multisig';
import { MultisigTransactionDS } from '@renderer/shared/api/storage';
import { AssetBalance } from '@renderer/entities/asset';
import type { Account, Contact, MultisigAccount, Wallet } from '@renderer/shared/core';
import { WalletIcon, walletModel, walletUtils } from '@renderer/entities/wallet';

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

type WalletsMap = Map<Wallet['id'], Wallet>;

const getFilteredWalletsMap = (wallets: Wallet[]): WalletsMap =>
  wallets.reduce((acc: WalletsMap, w: Wallet) => {
    // 2nd condition for legacy multisig
    if (walletUtils.isValidSignatory(w) || walletUtils.isMultiShard(w)) {
      acc.set(w.id, w);
    }

    return acc;
  }, new Map());

const getFilteredAccountsMap = (accounts: Account[], walletsMap: WalletsMap) =>
  accounts.reduce((acc: Map<Account['accountId'], Account>, a: Account) => {
    if (walletsMap.has(a.walletId)) {
      acc.set(a.accountId, a);
    }

    return acc;
  }, new Map());

const LogModal = ({ isOpen, onClose, tx, account, connection, contacts, accounts }: Props) => {
  const { t, dateLocale } = useI18n();
  const { getLiveTxEvents } = useMultisigEvent({});
  const filteredWalletsMap = getFilteredWalletsMap(useUnit(walletModel.$wallets));
  const filteredAccountMap = getFilteredAccountsMap(accounts, filteredWalletsMap);
  const events = getLiveTxEvents(tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated);

  const { transaction, description, status } = tx;
  const approvals = events.filter((e) => e.status === 'SIGNED');

  const asset =
    tx.transaction && getAssetById(tx.transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);
  const amount = tx.transaction && getTransactionAmount(tx.transaction);

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
          {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
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
                  .map((event) => {
                    const account = filteredAccountMap.get(event.accountId);
                    const wallet = account && filteredWalletsMap.get(account.walletId);

                    return (
                      <li key={`${event.accountId}_${event.status}`} className="flex flex-col">
                        <div className="flex gap-x-2 w-full items-center">
                          {wallet ? (
                            <WalletIcon type={wallet.type} size={16} />
                          ) : (
                            <Identicon
                              size={16}
                              address={toAddress(event.accountId, { prefix: addressPrefix })}
                              background={false}
                            />
                          )}
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
                    );
                  })}
              </ul>
            </section>
          ))}
      </div>
    </BaseModal>
  );
};

export default LogModal;
