import { useUnit } from 'effector-react';
import { groupBy } from 'lodash';
import { type ReactNode, useMemo } from 'react';

import {
  type Contact,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type Wallet,
  type WalletsMap,
} from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, getExtrinsicExplorer, sortByDateAsc } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, ContextMenu, ExplorerLink, FootnoteText, IconButton } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigEvent, type MultisigOperation } from '@/domains/network';
import { type ExtendedChain } from '@/entities/network';
import { Status, operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  connection?: ExtendedChain;
  contacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
};

const EventMessage = {
  initiated: 'log.initiatedMessage',
  approve: 'log.signedMessage',
  reject: 'log.cancelledMessage',
} as const;

const getFilteredWalletsMap = (wallets: Wallet[]): WalletsMap => {
  return wallets.reduce<WalletsMap>((acc, wallet) => {
    if (!walletUtils.isWatchOnly(wallet)) {
      acc[wallet.id] = wallet;
    }

    return acc;
  }, {});
};

const getFilteredAccountsMap = (walletsMap: WalletsMap) => {
  return Object.values(walletsMap).reduce<Record<AccountId, AnyAccount>>((acc, wallet) => {
    for (const account of wallet.accounts) {
      acc[account.accountId] = account;
    }

    return acc;
  }, {});
};

export const operationLogTitleTransformer = createTransformer<
  { operation: MultisigOperation; showCoreTransaction?: boolean },
  ReactNode
>();

const LogModal = ({ isOpen, onClose, operation, account, connection, contacts }: Props) => {
  const { t, formatDate } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);

  const externalTitleNode = useTransformer(operationLogTitleTransformer, { operation, showCoreTransaction });
  let titleNode;

  if (externalTitleNode) {
    titleNode = externalTitleNode;
  } else {
    const title =
      operation.section && operation.method
        ? formatSectionAndMethod(operation.section, operation.method)
        : t('operations.titles.unknown');
    titleNode = <TransactionTitle className="flex-1" title={title} />;
  }

  const filteredWalletsMap = getFilteredWalletsMap(wallets);
  const filteredAccountMap = getFilteredAccountsMap(filteredWalletsMap);
  const { status, events } = operation;
  const approvals = events.filter(e => e.status === 'approve');

  const groupedEvents = useMemo(() => {
    const groups = groupBy(events, ({ timestamp }) => formatDate(timestamp || 0, 'PP'));
    return Object.entries(groups).sort(sortByDateAsc);
  }, [events]);

  const getEventMessage = (event: MultisigEvent): string => {
    const isCreatedEvent = event.accountId === operation.depositor && event.status === 'approve';

    if (!account) return '';

    const signatoryName = operationDetailsUtils.getSignatoryName(
      event.accountId,
      account?.signatories,
      contacts,
      wallets,
      connection?.addressPrefix,
    );
    const eventType = isCreatedEvent ? 'initiated' : event.status;
    const eventMessage = EventMessage[eventType] || 'log.unknownMessage';

    return `${signatoryName} ${t(eventMessage)}`;
  };

  return (
    <Modal size="md" isOpen={isOpen} onToggle={onClose}>
      <Modal.Title close>{t('log.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <OperationIcon operation={operation} account={account} />
            {titleNode}
          </div>

          <Status status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        </div>

        <div className="flex max-h-[600px] min-h-[464px] flex-col gap-y-4 overflow-y-scroll bg-main-app-background p-5">
          {groupedEvents.map(([date, events]) => (
            <section className="w-full" key={date}>
              <FootnoteText as="h4" className="mb-4 text-text-tertiary">
                {date}
              </FootnoteText>

              <ul className="flex flex-col gap-y-4">
                {events
                  .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0))
                  .map(event => {
                    const account = filteredAccountMap[event.accountId];
                    const wallet = filteredWalletsMap[account?.walletId];

                    return (
                      <li key={`${event.accountId}_${event.status}`} className="flex flex-col">
                        <div className="flex w-full items-center gap-x-2">
                          {wallet ? (
                            <WalletIcon type={wallet.type} size={16} />
                          ) : (
                            <Identicon size={16} value={event.accountId} background={false} />
                          )}
                          <BodyText className="flex-1 text-text-secondary">{getEventMessage(event)}</BodyText>
                          <BodyText className="text-text-tertiary">{formatDate(Number(event.timestamp), 'p')}</BodyText>

                          {event.extrinsicHash && connection?.explorers && (
                            <div>
                              <ContextMenu button={<IconButton name="info" size={16} />}>
                                <ContextMenu.Group>
                                  <ul className="flex flex-col gap-y-2">
                                    {connection.explorers.map(explorer => (
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
