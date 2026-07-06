import { useUnit } from 'effector-react';
import { groupBy } from 'lodash';
import { useMemo } from 'react';

import { type Chain, type Wallet, type WalletsMap } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, sortByDateAsc, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, ContextMenu, ExplorerLink, FootnoteText, IconButton } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { type AnyAccount, type MultisigEvent, type MultisigOperation, useAccountName } from '@/domains/network';
import { operationDetailsUtils } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';

type Props = {
  operation: MultisigOperation;
  chain: Chain | null;
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

export const OperationLog = ({ operation, chain }: Props) => {
  const { formatDate } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const groupedEvents = useMemo(() => {
    const groups = groupBy(operation.events, ({ timestamp }) => formatDate(timestamp || 0, 'PP'));
    return Object.entries(groups).sort(sortByDateAsc);
  }, [operation.events]);

  const filteredWalletsMap = getFilteredWalletsMap(wallets);
  const filteredAccountMap = getFilteredAccountsMap(filteredWalletsMap);

  return (
    <div className="flex max-h-[500px] flex-col gap-y-4 overflow-y-auto">
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
  );
};
