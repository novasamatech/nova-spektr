import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId, type Wallet, CryptoType, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, isEthereumAccountId, toAccountId } from '@/shared/lib/utils';
import { Accordion, Button, CaptionText, FootnoteText, HelpText } from '@/shared/ui';
import {
  ROW_SEPARATOR_CLASS,
  getColumnStyle,
  getLeftBlockWidth,
  operationColumns,
} from '@/shared/ui/operations-table-layout';
import { Tooltip } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, accounts, contactMultisigsModel } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { authModel } from '@/aggregates/backend';
import { useOperationColumnWidths } from '@/aggregates/operations-table-layout';
import { WalletPairingOperationTrigger } from '@/features/wallet-pairing';
import { NamedAccount } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { useDraftOperationTitle } from '../lib/useDraftOperationTitle';
import { useDraftTransactionAmount } from '../lib/useDraftTransactionAmount';

import { DraftFullInfo } from './DraftFullInfo';
import { DraftIcon } from './DraftIcon';

type DraftRowProps = {
  draft: Draft;
  canWrite: boolean;
  canDelete: boolean;
  isSubmitted: boolean;
  hasInitiator: boolean;
  isHighlighted: boolean;
  multisigAccount: AnyAccount | null;
  /**
   * The draft's proxied source (when `draft.proxyAccountId` is set). Resolved
   * by DraftsSection so the overview opens with the proxied — the deepest
   * source of the signing path — pre-selected.
   */
  proxyAccount?: AnyAccount | null;
  rowRef?: (el: HTMLDivElement | null) => void;
  onDelete: (id: string) => void;
  onEdit: (draft: Draft) => void;
  onSubmit: (draft: Draft) => void;
};

const DraftDescription = ({ description }: { description: string | null | undefined }) => {
  const { t } = useI18n();

  if (!description) {
    return (
      <div className="min-w-0 truncate">
        <FootnoteText className="text-text-tertiary italic">{t('operations.drafts.noDescription')}</FootnoteText>
      </div>
    );
  }

  return (
    <div className="min-w-0 truncate" title={description}>
      <FootnoteText className="truncate text-text-primary">{description}</FootnoteText>
    </div>
  );
};

export const DraftRow = ({
  draft,
  canWrite,
  canDelete,
  isSubmitted,
  hasInitiator,
  isHighlighted,
  multisigAccount,
  proxyAccount,
  rowRef,
  onDelete,
  onEdit,
  onSubmit,
}: DraftRowProps) => {
  const { t, formatDate } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const backendContacts = useUnit(contactModel.$backendContacts);
  const allAccounts = useUnit(accounts.$list);
  const widths = useOperationColumnWidths();

  const chain = chains[draft.chainId as ChainId];
  const contact = backendContacts.find((c) => c.accountId === draft.multisigAccountId);

  const baseMultisigAccount = useMemo<AnyAccount | null>(() => {
    if (multisigAccount) return multisigAccount;
    if (!contact?.signatories || !contact.threshold) return null;

    return contactMultisigsModel.toSyntheticMultisigAccount({
      accountId: contact.accountId,
      name: contact.name,
      signatories: contact.signatories.map((s) => toAccountId(s)),
      threshold: contact.threshold,
      cryptoType: isEthereumAccountId(contact.accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
      contactIds: [contact.id],
    });
  }, [multisigAccount, contact]);

  // Trim the multisig's signatories to just the draft's chosen signer so the
  // overview graph renders the specific execution path (proxied → multisig →
  // signer), not every signatory of the multisig.
  const pathMultisigAccount = useMemo<AnyAccount | null>(() => {
    if (!baseMultisigAccount) return null;
    if (!accountUtils.isAnyMultisigAccount(baseMultisigAccount)) return baseMultisigAccount;
    if (!draft.initiatorAccountId) return baseMultisigAccount;

    const pathSigners = baseMultisigAccount.signatories.filter((s) => s.accountId === draft.initiatorAccountId);
    if (pathSigners.length === 0) return baseMultisigAccount;

    return { ...baseMultisigAccount, signatories: pathSigners };
  }, [baseMultisigAccount, draft.initiatorAccountId]);

  // First entry is what the overview modal pre-selects — start from the
  // proxied source when present so the graph anchors on the deepest hop.
  const overviewWalletAccounts = useMemo<AnyAccount[]>(() => {
    const items: AnyAccount[] = [];
    if (proxyAccount) items.push(proxyAccount);
    if (pathMultisigAccount) items.push(pathMultisigAccount);
    return items;
  }, [proxyAccount, pathMultisigAccount]);

  const hasOverview = overviewWalletAccounts.length > 0;

  const operationTitle = useDraftOperationTitle(draft);
  const amount = useDraftTransactionAmount(draft);

  const displayAccountIdRaw = draft.proxyAccountId ?? draft.multisigAccountId;
  const displayAccountId = displayAccountIdRaw ? toAccountId(displayAccountIdRaw) : undefined;
  const initiatorAccountId = draft.initiatorAccountId ? toAccountId(draft.initiatorAccountId) : undefined;
  // Fallback only: the initiator's own contact/identity name still wins, the
  // wallet name just stands in for a Vault derivation path or a short address.
  const initiatorWallet = useMemo<Wallet | undefined>(() => {
    if (!initiatorAccountId) return undefined;

    const owned = allAccounts.find((a) => a.accountId === initiatorAccountId);

    return owned ? wallets.find((w) => w.id === owned.walletId) : undefined;
  }, [allAccounts, wallets, initiatorAccountId]);
  const displayAccount = draft.proxyAccountId ? proxyAccount : baseMultisigAccount;
  const displayWallet = useMemo<Wallet | undefined>(() => {
    if (!displayAccount) return undefined;

    const wallet = wallets.find((w) => w.id === displayAccount.walletId);

    if (draft.proxyAccountId && accountUtils.isProxiedAccount(displayAccount) && wallet?.type !== WalletType.PROXIED) {
      return {
        id: displayAccount.walletId,
        name: draft.proxyContact?.name ?? displayAccount.name,
        type: WalletType.PROXIED,
        accounts: [displayAccount],
      };
    }

    return wallet;
  }, [displayAccount, draft.proxyAccountId, draft.proxyContact?.name, wallets]);

  return (
    <div
      ref={rowRef}
      className={cnTw(
        'focus-active:shadow-card-shadow rounded bg-block-background-default transition-shadow hover:shadow-card-shadow',
        isHighlighted && 'ring-2 ring-icon-accent ring-inset',
      )}
    >
      <Accordion>
        {/* text-left: Disclosure.Button is a <button>, whose default centered
            text-align cascades into the address/description lines */}
        <Accordion.Button buttonClass="px-4 text-left">
          <div className="group/row flex h-[68px] w-full items-center gap-x-2 overflow-hidden">
            <div
              className={cnTw(operationColumns.leftBlock, 'flex h-full items-center gap-x-2')}
              style={getColumnStyle(getLeftBlockWidth(widths))}
            >
              <DraftIcon />

              <div
                className={cnTw(operationColumns.titleCell, 'flex flex-col justify-center gap-y-0.5 overflow-hidden')}
              >
                <FootnoteText className="truncate text-text-primary">
                  {operationTitle ?? <span className="text-text-tertiary">{t('operations.titles.unknown')}</span>}
                </FootnoteText>
                <div className="flex items-center gap-x-1.5 overflow-hidden">
                  {chain ? (
                    <ChainTitle chainId={chain.chainId} fontClass="text-help-text text-text-tertiary" />
                  ) : (
                    <HelpText className="text-text-negative">{t('operations.drafts.unknownChain')}</HelpText>
                  )}
                  <HelpText className="shrink-0 text-text-tertiary">
                    · {formatDate(new Date(draft.createdAt), 'PP')}
                  </HelpText>
                </div>
              </div>

              <div
                className={cnTw(operationColumns.value, ROW_SEPARATOR_CLASS, 'flex h-full items-center')}
                style={getColumnStyle(widths.value)}
              >
                {amount && <OperationAmount value={amount.value} asset={amount.asset} />}
              </div>
            </div>

            <div
              className={cnTw(operationColumns.submitter, ROW_SEPARATOR_CLASS, 'flex h-full items-center')}
              style={getColumnStyle(widths.submitter)}
            >
              {displayAccountId && (
                <NamedAccount
                  accountId={displayAccountId}
                  chain={chain}
                  wallet={displayWallet}
                  iconSize={28}
                  hideExplorers
                  variant="short"
                />
              )}
            </div>

            <div
              className={cnTw(operationColumns.initiator, ROW_SEPARATOR_CLASS, 'h-full items-center')}
              style={getColumnStyle(widths.initiator)}
            >
              {initiatorAccountId ? (
                <NamedAccount
                  accountId={initiatorAccountId}
                  chain={chain}
                  wallet={initiatorWallet}
                  walletNameAs="fallback"
                  iconSize={28}
                  hideExplorers
                  variant="short"
                />
              ) : (
                <FootnoteText className="truncate text-text-tertiary italic">
                  {t('operations.drafts.noInitiator')}
                </FootnoteText>
              )}
            </div>

            <div className={cnTw(operationColumns.description, ROW_SEPARATOR_CLASS, 'flex h-full items-center')}>
              <DraftDescription description={draft.description} />
            </div>

            <div className={cnTw(operationColumns.status, ROW_SEPARATOR_CLASS, 'h-full')} />

            <div
              className={cnTw(operationColumns.actions, ROW_SEPARATOR_CLASS, 'flex h-full items-center')}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0 flex-1">
                {isSubmitted ? (
                  <div className="flex items-center justify-center rounded-[20px] border border-icon-positive/30 bg-icon-positive/8 px-2.5 py-1">
                    <CaptionText className="text-icon-positive uppercase">
                      {t('operations.drafts.submittedBadge')}
                    </CaptionText>
                  </div>
                ) : !hasInitiator ? (
                  <WalletPairingOperationTrigger tooltipContent={t('operation.addWalletTooltipMultisig')} />
                ) : !draft.callData ? (
                  <Tooltip open={canWrite && isAuthenticated ? false : undefined}>
                    <Tooltip.Trigger>
                      <Button
                        size="sm"
                        variant="fill"
                        className="w-full"
                        disabled={!isAuthenticated || !canWrite}
                        onClick={() => onSubmit(draft)}
                      >
                        {t('operations.drafts.addCallDataButton')}
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {!isAuthenticated
                        ? t('operations.drafts.connectToSubmit')
                        : t('operations.drafts.noWritePermission')}
                    </Tooltip.Content>
                  </Tooltip>
                ) : (
                  <Tooltip open={isAuthenticated ? false : undefined}>
                    <Tooltip.Trigger>
                      <Button
                        size="sm"
                        variant="fill"
                        className="w-full"
                        disabled={!isAuthenticated}
                        onClick={() => onSubmit(draft)}
                      >
                        {t('operations.drafts.submitButton')}
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t('operations.drafts.connectToSubmit')}</Tooltip.Content>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </Accordion.Button>
        <Accordion.Content>
          <div className="border-t border-divider">
            <DraftFullInfo
              draft={draft}
              chain={chain ?? null}
              multisigAccount={baseMultisigAccount}
              overviewWalletAccounts={hasOverview ? overviewWalletAccounts : []}
              canEdit={canWrite && !isSubmitted}
              canDelete={canDelete && !isSubmitted}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </Accordion.Content>
      </Accordion>
    </div>
  );
};
