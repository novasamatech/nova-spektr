import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId, CryptoType } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, isEthereumAccountId, toAccountId } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, HelpText, IconButton } from '@/shared/ui';
import { ConfirmModal, Copy, Tooltip } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, contactMultisigsModel } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { authModel } from '@/aggregates/backend';
import { OperationAmount } from '@/features/multisig-operations';
import { WalletPairingOperationTrigger } from '@/features/wallet-pairing';
import { NamedAccount } from '@/widgets/NameResolver';
import { draftAccountsOverviewSlot } from '../lib/draft-row-slot';
import { useDraftOperationTitle } from '../lib/useDraftOperationTitle';
import { useDraftTransactionAmount } from '../lib/useDraftTransactionAmount';
import { draftDeepLinkModel } from '../model/draft-deep-link';

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

const DESCRIPTION_MAX_CHARS = 60;

const DraftDescription = ({ description }: { description: string | null | undefined }) => {
  const { t } = useI18n();

  if (!description) {
    return (
      <div className="min-w-0 flex-1">
        <FootnoteText className="text-text-tertiary italic">{t('operations.drafts.noDescription')}</FootnoteText>
      </div>
    );
  }

  const isTrimmed = description.length > DESCRIPTION_MAX_CHARS;
  const visible = isTrimmed ? `${description.slice(0, DESCRIPTION_MAX_CHARS).trimEnd()}…` : description;

  return (
    <div className="min-w-0 flex-1">
      <Tooltip side="top" open={isTrimmed ? undefined : false}>
        <Tooltip.Trigger>
          <div>
            <FootnoteText className="text-text-primary">{visible}</FootnoteText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div className="max-w-[400px] break-words whitespace-normal">{description}</div>
        </Tooltip.Content>
      </Tooltip>
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
  const { t } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const backendContacts = useUnit(contactModel.$backendContacts);

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
  const displayAccount = draft.proxyAccountId ? proxyAccount : baseMultisigAccount;
  const displayWallet = displayAccount ? wallets.find((w) => w.id === displayAccount.walletId) : undefined;

  return (
    <div
      ref={rowRef}
      className={cnTw(
        'mx-0.5 overflow-hidden bg-block-background-default',
        'rounded transition-shadow hover:shadow-card-shadow',
        isHighlighted && 'ring-2 ring-icon-accent',
      )}
    >
      <div className="flex min-h-[52px] w-full min-w-0 items-center gap-x-3 px-4 py-2">
        <DraftIcon />

        <div className="flex w-[200px] shrink-0 flex-col justify-center gap-y-0.5 overflow-hidden">
          <FootnoteText className="truncate text-text-primary">
            {operationTitle ?? <span className="text-text-tertiary">{t('operations.titles.unknown')}</span>}
          </FootnoteText>
          {chain ? (
            <ChainTitle chainId={chain.chainId} fontClass="text-help-text text-text-tertiary" />
          ) : (
            <HelpText className="text-text-negative">{t('operations.drafts.unknownChain')}</HelpText>
          )}
        </div>

        <DraftDescription description={draft.description} />

        <div className="flex w-[200px] shrink-0 items-center">
          {amount && <OperationAmount value={amount.value} asset={amount.asset} />}
        </div>

        <div className="flex w-[200px] shrink-0 items-center">
          {displayAccountId && (
            <NamedAccount
              accountId={displayAccountId}
              chain={chain}
              wallet={displayWallet}
              iconSize={32}
              hideExplorers
              variant="short"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-x-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex w-[90px] shrink-0 items-center justify-center">
            {hasOverview && (
              <Slot
                id={draftAccountsOverviewSlot}
                props={{
                  walletAccounts: overviewWalletAccounts,
                  initialChainId: draft.chainId,
                  exclusive: true,
                  trigger: (
                    <Button size="sm" variant="text">
                      {t('operations.drafts.overviewButton')}
                    </Button>
                  ),
                }}
              />
            )}
          </div>
          <div className="flex w-[40px] shrink-0 items-center justify-center">
            {canWrite && !isSubmitted && (
              <Button size="sm" variant="text" onClick={() => onEdit(draft)}>
                {t('operations.drafts.editButton')}
              </Button>
            )}
          </div>
          <div className="flex w-[130px] shrink-0 items-center justify-center">
            {isSubmitted ? (
              <div className="flex items-center rounded-[20px] border border-icon-positive/30 bg-icon-positive/8 px-2.5 py-1">
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
                    disabled={!isAuthenticated || !canWrite}
                    onClick={() => onSubmit(draft)}
                  >
                    {t('operations.drafts.addCallDataButton')}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {!isAuthenticated ? t('operations.drafts.connectToSubmit') : t('operations.drafts.noWritePermission')}
                </Tooltip.Content>
              </Tooltip>
            ) : (
              <Tooltip open={isAuthenticated ? false : undefined}>
                <Tooltip.Trigger>
                  <Button size="sm" variant="fill" disabled={!isAuthenticated} onClick={() => onSubmit(draft)}>
                    {t('operations.drafts.submitButton')}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('operations.drafts.connectToSubmit')}</Tooltip.Content>
              </Tooltip>
            )}
          </div>
          <Tooltip>
            <Tooltip.Trigger>
              <Copy
                value={draftDeepLinkModel.generateDraftDeepLink(draft.id)}
                notification={t('operations.drafts.linkCopied')}
              >
                <IconButton className="shrink-0 text-icon-default" name="share" />
              </Copy>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('operations.drafts.shareDraftTooltip')}</Tooltip.Content>
          </Tooltip>
          <div className="flex w-[35px] shrink-0 items-center justify-center">
            {canDelete && !isSubmitted && (
              <ConfirmModal
                cancelText={t('operations.drafts.deleteCancel')}
                confirmText={t('operations.drafts.deleteConfirm')}
                description={t('operations.drafts.deleteDescription')}
                title={t('operations.drafts.deleteTitle')}
                type="warning"
                onConfirm={() => onDelete(draft.id)}
              >
                <ConfirmModal.Trigger>
                  <IconButton name="delete" className="text-icon-default hover:text-text-negative" />
                </ConfirmModal.Trigger>
              </ConfirmModal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
