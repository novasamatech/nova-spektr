import { useUnit } from 'effector-react';
import groupBy from 'lodash/groupBy';

import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import {
  type Account,
  type Contact,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type MultisigEvent,
  type SigningStatus,
  type Wallet,
  type WalletsMap,
} from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { SS58_DEFAULT_PREFIX, getExtrinsicExplorer, sortByDateAsc, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, ContextMenu, ExplorerLink, FootnoteText, IconButton, Identicon } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { useMultisigEvent } from '@/entities/multisig';
import { type ExtendedChain } from '@/entities/network';
import { Status, operationDetailsUtils } from '@/entities/operations';
import { WalletIcon, walletModel, walletUtils } from '@/entities/wallet';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  account?: MultisigAccount | FlexibleMultisigAccount;
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
    if (walletUtils.isValidSignSignatory(wallet)) {
      acc[wallet.id] = wallet;
    }

    return acc;
  }, {});
};

const getFilteredAccountsMap = (walletsMap: WalletsMap) => {
  return Object.values(walletsMap).reduce<Record<AccountId, Account>>((acc, wallet) => {
    for (const account of wallet.accounts) {
      acc[account.accountId] = account;
    }

    return acc;
  }, {});
};

type SlotProps = {
  operation: MultisigTransactionDS | FlexibleMultisigTransactionDS;
};

export const logTitleSlot = createSlot<SlotProps>();

const LogModal = ({ isOpen, onClose, tx, account, connection, contacts }: Props) => {
  const { t, formatDate } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const { getLiveTxEvents } = useMultisigEvent({});
  const filteredWalletsMap = getFilteredWalletsMap(wallets);
  const filteredAccountMap = getFilteredAccountsMap(filteredWalletsMap);
  const events = getLiveTxEvents(tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated);

  const { status } = tx;
  const approvals = events.filter((e) => e.status === 'SIGNED');

  const addressPrefix = connection?.addressPrefix || SS58_DEFAULT_PREFIX;

  const groupedEvents = groupBy(events, ({ dateCreated }) => formatDate(new Date(dateCreated || 0), 'PP'));

  const getEventMessage = (event: MultisigEvent): string => {
    const isCreatedEvent =
      event.accountId === tx.depositor && (event.status === 'SIGNED' || event.status === 'PENDING_SIGNED');

    const signatoryName = operationDetailsUtils.getSignatoryName(
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
    <Modal size="md" isOpen={isOpen} onToggle={onClose}>
      <Modal.Title close>{t('log.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Slot id={logTitleSlot} props={{ operation: tx }} />

          <Status status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        </div>

        <div className="flex max-h-[600px] min-h-[464px] flex-col gap-y-4 overflow-y-scroll bg-main-app-background p-5">
          {Object.entries(groupedEvents)
            .sort(sortByDateAsc<MultisigEvent>)
            .map(([date, events]) => (
              <section className="w-full" key={date}>
                <FootnoteText as="h4" className="mb-4 text-text-tertiary">
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
                          <div className="flex w-full items-center gap-x-2">
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
                              {event.dateCreated && formatDate(new Date(event.dateCreated), 'p')}
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
      </Modal.Content>
    </Modal>
  );
};

export default LogModal;
