import { useUnit } from 'effector-react';
import { type ReactNode, useMemo, useState } from 'react';

import {
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxyType,
  type Signatory,
  ProxyTypes,
  TransactionType,
} from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { CountChip, FootnoteText, IconButton } from '@/shared/ui';
import { Copy, Tooltip } from '@/shared/ui-kit';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  isContactMultisigAccount,
  multisigOperationService,
} from '@/domains/network';
import { useChain } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { SignatoryCard } from '@/entities/signatory';
import { accountUtils } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';

import { NotifySignersButton } from './NotifySignersButton';
import { OperationLog } from './OperationLog';

// One segmented control: identical pill geometry for both tabs, the selected
// one carries the grey tab background, the other is tertiary with a hover tint.
const TAB_CLASS =
  'flex h-[26px] items-center gap-1.5 rounded-lg px-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-icon-accent';
const TAB_ACTIVE_CLASS = 'bg-tab-background text-text-primary';
const TAB_INACTIVE_CLASS = 'text-text-tertiary hover:bg-action-background-hover';

const getOperationProxyType = (operation: MultisigOperation): ProxyType | null => {
  if (operation.transaction?.type !== TransactionType.PROXY) return null;

  return Object.values(ProxyTypes).find(proxyType => proxyType === operation.transaction?.args.forceProxyType) ?? null;
};

export const operationOverviewSlot = createSlot<{
  walletAccounts: AnyAccount[];
  trigger?: ReactNode;
  initialChainId?: string;
  exclusive?: boolean;
}>();

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  deepLink: string;
};

type ActiveTab = 'signatories' | 'log';

export const OperationSignatories = ({ operation, account, deepLink }: Props) => {
  const { t } = useI18n();
  const chain = useChain(operation.chainId);

  const accountsList = useUnit(accounts.$list);

  const [activeTab, setActiveTab] = useState<ActiveTab>('signatories');

  const approvals = multisigOperationService.getApprovals(operation);
  const cancellation = operation.events.filter(e => e.status === 'reject');

  const signatoriesList = useMemo(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = account.signatories.find(s => s.accountId === cancellation[0]!.accountId);
      if (cancelSignatories) {
        tempCancellation.push(cancelSignatories);
      }
    }

    const tempApprovals = approvals
      .sort((a, b) => (a.blockCreated || 0) - (b.blockCreated || 0))
      .map(a => account.signatories.find(s => s.accountId === a.accountId))
      .filter(nonNullable);

    return [...new Set<Signatory>([...tempCancellation, ...tempApprovals, ...account.signatories])];
  }, [account.signatories.length, approvals.length, cancellation.length]);

  // Contact-backed external multisigs aren't part of the user's account
  // graph, so the "Open overview" structure view has nothing meaningful to
  // visualize — hide the trigger.
  const isExternalMultisig = isContactMultisigAccount(account);

  // Flex multisig overview: render only the proxy connection used by this operation.
  const overviewAccounts = useMemo<AnyAccount[]>(() => {
    if (!accountUtils.isFlexibleMultisigAccount(account)) return [account];

    const proxied = accountsList.filter(accountUtils.isProxiedAccount).find(a => a.accountId === account.accountId);
    const multisig = accountsList
      .filter(accountUtils.isMultisigAccount)
      .find(a => a.accountId === account.multisigAccountId);

    if (!proxied || !multisig) return [account];

    const proxyType = getOperationProxyType(operation) ?? account.proxyType;
    const operationConnection = proxied.connections.find(
      connection => connection.proxyAccountId === account.multisigAccountId && connection.proxyType === proxyType,
    ) ?? { proxyAccountId: account.multisigAccountId, proxyType, delay: 0 };

    return [
      {
        ...proxied,
        connections: [operationConnection],
      },
      multisig,
    ];
  }, [account, accountsList, operation]);

  return (
    <div className="flex flex-col border-r border-divider p-4">
      <div className="mb-4 flex items-center gap-2">
        <div role="group" aria-label={t('operation.signatoriesTitle')} className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={activeTab === 'signatories'}
            className={cnTw(TAB_CLASS, activeTab === 'signatories' ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS)}
            onClick={() => setActiveTab('signatories')}
          >
            <FootnoteText as="span" className="font-semibold text-inherit">
              {t('operation.signatoriesTitle')}
            </FootnoteText>
          </button>

          <button
            type="button"
            aria-pressed={activeTab === 'log'}
            className={cnTw(TAB_CLASS, activeTab === 'log' ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS)}
            onClick={() => setActiveTab('log')}
          >
            <FootnoteText as="span" className="font-semibold text-inherit">
              {t('operation.logButton')}
            </FootnoteText>
            <CountChip count={operation.events.length} />
          </button>
        </div>

        <NotifySignersButton operation={operation} />

        <span className="flex-1" />

        {!isExternalMultisig && (
          <Slot
            id={operationOverviewSlot}
            props={{
              walletAccounts: overviewAccounts,
              initialChainId: operation.chainId,
              exclusive: true,
              // Wrapped in a plain div: Modal.Trigger clones props onto its child via
              // Radix asChild, and our Tooltip component doesn't forward unknown props,
              // so the click-to-open handler must land on a real DOM node.
              trigger: (
                <div>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <IconButton name="accountStructure" className="text-icon-default" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t('operation.openOverviewButton')}</Tooltip.Content>
                  </Tooltip>
                </div>
              ),
            }}
          />
        )}

        <Tooltip>
          <Tooltip.Trigger>
            <Copy value={deepLink} notification={t('general.notifications.operationLinkCopied')}>
              <IconButton name="share" className="text-icon-default" />
            </Copy>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('operations.shareOperationTooltip')}</Tooltip.Content>
        </Tooltip>
      </div>

      {activeTab === 'signatories' ? (
        <ul className="flex flex-col gap-y-2">
          {signatoriesList.map(signatory => (
            <SignatoryCard
              key={signatory.accountId}
              status={operationDetailsUtils.getSignatoryStatus(operation.events, signatory.accountId)}
            >
              {/* No `wallet` / `title`: the resolver must reach the account's contact or
                  identity name — passing the wallet would short-circuit to the keyset
                  name, passing `account.name` would show a Vault derivation path. */}
              <NamedAccount accountId={signatory.accountId} chain={chain ?? undefined} variant="short" iconSize={20} />
            </SignatoryCard>
          ))}
        </ul>
      ) : (
        <OperationLog operation={operation} chain={chain} />
      )}
    </div>
  );
};
