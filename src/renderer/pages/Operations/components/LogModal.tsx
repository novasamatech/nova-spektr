import groupBy from 'lodash/groupBy';
import { format } from 'date-fns';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { ExtendedChain } from '@entities/network';
import { MultisigEvent, SigningStatus } from '@entities/transaction/model/transaction';
import { TransactionTitle } from './TransactionTitle/TransactionTitle';
import OperationStatus from './OperationStatus';
import { getSignatoryName, getTransactionAmount } from '../common/utils';
import { BaseModal, BodyText, FootnoteText, Identicon, ContextMenu, ExplorerLink, IconButton } from '@shared/ui';
import { getAssetById, SS58_DEFAULT_PREFIX, toAddress, getExtrinsicExplorer, sortByDateAsc } from '@shared/lib/utils';
import { useMultisigEvent } from '@entities/multisig';
import { MultisigTransactionDS } from '@shared/api/storage';
import { AssetBalance } from '@entities/asset';
import type { BaseAccount, Contact, MultisigAccount, Wallet, AccountId, WalletsMap } from '@shared/core';
import { WalletIcon, walletModel, walletUtils } from '@entities/wallet';
import { chainsService } from '@shared/api/network';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
  connection?: ExtendedChain;
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

const getFilteredWalletsMap = (wallets: Wallet[]): WalletsMap => {
  return wallets.reduce<WalletsMap>((acc, wallet) => {
    if (
      walletUtils.isValidSignatory(wallet) ||
      walletUtils.isPolkadotVault(wallet) ||
      walletUtils.isMultiShard(wallet)
    ) {
      acc[wallet.id] = wallet;
    }

    return acc;
  }, {});
};

const getFilteredAccountsMap = (walletsMap: WalletsMap) => {
  return Object.values(walletsMap).reduce<Record<AccountId, BaseAccount>>((acc, wallet) => {
    wallet.accounts.forEach((account) => {
      acc[account.accountId] = account;
    });

    return acc;
  }, {});
};

const LogModal = ({ isOpen, onClose, tx, account, connection, contacts }: Props) => {
  const { t, dateLocale } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const { getLiveTxEvents } = useMultisigEvent({});
  const filteredWalletsMap = getFilteredWalletsMap(wallets);
  const filteredAccountMap = getFilteredAccountsMap(filteredWalletsMap);
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
      wallets,
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
                    const account = filteredAccountMap[event.accountId];
                    const wallet = filteredWalletsMap[account?.walletId];

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
                          <BodyText className="flex-1 text-text-secondary">{getEventMessage(event)}</BodyText>
                          <BodyText className="text-text-tertiary">
                            {event.dateCreated && format(new Date(event.dateCreated), 'p', { locale: dateLocale })}
                          </BodyText>

                          {event.extrinsicHash && connection?.explorers && (
                            <div>
                              <ContextMenu button={<IconButton name="info" size={16} />}>
                                <ContextMenu.Group>
                                  <ul className="flex flex-col gap-y-2">
                                    {connection.explorers.map((explorer) => (
                                      <li key={explorer.name}>
                                        <ExplorerLink
                                          name={explorer.name}
                                          href={getExtrinsicExplorer(explorer, event.extrinsicHash!)}
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                </ContextMenu.Group>
                              </ContextMenu>
                            </div>
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
