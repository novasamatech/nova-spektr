import { useUnit } from 'effector-react';
import { groupBy } from 'lodash';
import { type ReactNode, useMemo } from 'react';

import {
  type Chain,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type Wallet,
  type WalletsMap,
} from '@/shared/core';
import { createTransformer, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, nonNullable, sortByDateAsc, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, ContextMenu, ExplorerLink, FootnoteText, IconButton } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import {
  type AnyAccount,
  type MultisigEvent,
  type MultisigOperation,
  multisigOperationService,
  useAccountName,
} from '@/domains/network';
import { Status, operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

import { OperationIcon } from './OperationIcon';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  chain: Chain | null;
  isOpen: boolean;
  onClose: () => void;
};

const EventMessageKeys = {
  initiated: 'log.initiatedMessage',
  approve: 'log.signedMessage',
  reject: 'log.cancelledMessage',
} as const;

type EventMessageProps = {
  event: MultisigEvent;
  operation: MultisigOperation;
  chain: Chain | null;
};

const EventMessage = ({ event, operation, chain }: EventMessageProps) => {
  const { t } = useI18n();
  const signatoryName = useAccountName({ accountId: event.accountId, chain });

  const isCreatedEvent = event.accountId === operation.depositor && event.status === 'approve';
  const eventType = isCreatedEvent ? 'initiated' : event.status;
  const eventMessage = EventMessageKeys[eventType] || 'log.unknownMessage';

  return (
    <>
      {signatoryName} {t(eventMessage)}
    </>
  );
};

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

const LogModal = ({ isOpen, onClose, operation, account, chain }: Props) => {
  const { t, formatDate } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const showCoreTransaction = accountUtils.isFlexibleMultisigAccount(account);

  const { status, events } = operation;

  const groupedEvents = useMemo(() => {
    const groups = groupBy(events, ({ timestamp }) => formatDate(timestamp || 0, 'PP'));
    return Object.entries(groups).sort(sortByDateAsc);
  }, [events]);

  const externalTitleNode = useTransformer(operationLogTitleTransformer, { operation, showCoreTransaction });

  const filteredWalletsMap = getFilteredWalletsMap(wallets);
  const filteredAccountMap = getFilteredAccountsMap(filteredWalletsMap);
  const approvals = multisigOperationService.getApprovals(operation);

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
                    const wallet = account ? filteredWalletsMap[account.walletId] : undefined;

                    const explorerLinks =
                      event.blockCreated && Number.isInteger(event.blockCreated) && chain?.explorers
                        ? chain.explorers
                            .map(explorer => ({
                              name: explorer.name,
                              href: operationDetailsUtils.getMultisigEventLink(
                                event.indexCreated,
                                event.blockCreated,
                                explorer,
                              ),
                            }))
                            .filter(link => nonNullable(link.href))
                        : [];

                    return (
                      <li key={`${event.accountId}_${event.status}`} className="flex flex-col">
                        <div className="flex w-full items-center gap-x-2">
                          {wallet ? (
                            <WalletIcon type={wallet.type} size={16} />
                          ) : (
                            <Identicon size={16} address={toAddress(event.accountId)} background={false} />
                          )}
                          <BodyText className="flex-1 text-text-secondary">
                            <EventMessage event={event} operation={operation} chain={chain} />
                          </BodyText>
                          <BodyText className="text-text-tertiary">{formatDate(Number(event.timestamp), 'p')}</BodyText>

                          {explorerLinks.length > 0 && (
                            <div>
                              <ContextMenu button={<IconButton name="info" size={16} />}>
                                <ContextMenu.Group>
                                  <ul className="flex flex-col space-y-2">
                                    {explorerLinks.map(({ name, href }) => (
                                      <li key={name}>
                                        <ExplorerLink name={name} href={href} />
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
