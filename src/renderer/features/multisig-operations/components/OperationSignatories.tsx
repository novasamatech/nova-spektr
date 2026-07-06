import { useUnit } from 'effector-react';
import { type ReactNode, useMemo, useState } from 'react';

import {
  type Chain,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxyType,
  type Signatory,
  type Wallet,
  ProxyTypes,
  TransactionType,
} from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CountChip, FootnoteText, IconButton, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Copy, Tooltip } from '@/shared/ui-kit';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  isContactMultisigAccount,
  multisigOperationService,
  useAccountName,
} from '@/domains/network';
import { useChain } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { SignatoryCard } from '@/entities/signatory';
import { accountUtils, walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';

import { OperationLog } from './OperationLog';

type SignatoryAddressProps = {
  accountId: AccountId;
  chain: Chain | null;
};

const SignatoryAddress = ({ accountId, chain }: SignatoryAddressProps) => {
  const name = useAccountName({ accountId, chain });

  return (
    <Address
      title={name}
      address={toAddress(accountId, { prefix: chain?.addressPrefix })}
      variant="short"
      canCopy
      showIcon
    />
  );
};

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

type WalletSignatory = Signatory & { account: AnyAccount; wallet: Wallet };

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  deepLink: string;
};

type ActiveTab = 'signatories' | 'log';

export const OperationSignatories = ({ operation, account, deepLink }: Props) => {
  const { t } = useI18n();
  const chain = useChain(operation.chainId);

  const wallets = useUnit(walletModel.$wallets);
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

  const walletSignatories: WalletSignatory[] = signatoriesList.reduce((acc: WalletSignatory[], signatory) => {
    const signatoryAccounts = accountsList.filter(account => account.accountId === signatory.accountId);
    const signatoryWallet = wallets.find(w => signatoryAccounts.some(account => account.walletId === w.id));
    const signatoryAccount = signatoryAccounts.find(account => account.walletId === signatoryWallet?.id);

    if (signatoryAccount && signatoryWallet) {
      acc.push({ ...signatory, account: signatoryAccount, wallet: signatoryWallet });
    }

    return acc;
  }, []);

  const walletSignatoriesMap = new Map(walletSignatories.map(signatory => [signatory.accountId, signatory]));

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
        <div role="tablist" aria-label={t('operation.signatoriesTitle')} className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'signatories'}
            className={cnTw(
              'rounded-md px-2 py-1 transition-colors',
              activeTab !== 'signatories' && 'hover:bg-action-background-hover',
            )}
            onClick={() => setActiveTab('signatories')}
          >
            <SmallTitleText className={cnTw(activeTab !== 'signatories' && 'text-text-tertiary')}>
              {t('operation.signatoriesTitle')}
            </SmallTitleText>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'log'}
            className={cnTw(
              'flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors',
              activeTab === 'log' ? 'bg-tab-background' : 'hover:bg-action-background-hover',
            )}
            onClick={() => setActiveTab('log')}
          >
            <FootnoteText className={cnTw(activeTab !== 'log' && 'text-text-tertiary')}>
              {t('operation.logButton')}
            </FootnoteText>
            <CountChip count={operation.events.length} />
          </button>
        </div>

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
          {signatoriesList.map(signatory => {
            const walletSignatory = walletSignatoriesMap.get(signatory.accountId);

            return (
              <SignatoryCard
                key={signatory.accountId}
                status={operationDetailsUtils.getSignatoryStatus(operation.events, signatory.accountId)}
              >
                {walletSignatory ? (
                  <NamedAccount
                    accountId={walletSignatory.account.accountId}
                    chain={chain ?? undefined}
                    title={walletSignatory.account.name}
                    wallet={walletSignatory.wallet}
                    variant="short"
                    iconSize={20}
                  />
                ) : (
                  <SignatoryAddress accountId={signatory.accountId} chain={chain} />
                )}
              </SignatoryCard>
            );
          })}
        </ul>
      ) : (
        <OperationLog operation={operation} chain={chain} />
      )}
    </div>
  );
};
