import { isHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, useMemo } from 'react';

import { type CallData, type ChainId, CryptoType } from '@/shared/core';
import { Slot, createSlot, useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import {
  cnTw,
  formatSectionAndMethod,
  getNativeAssetId,
  isEthereumAccountId,
  toAccountId,
  toAddress,
  toShortAddress,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, FootnoteText, HelpText, Icon, IconButton } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { ConfirmModal, Copy, Tooltip } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, contactMultisigsModel } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, useApi } from '@/entities/network';
import { decodeCallData, findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { authModel } from '@/aggregates/backend';
import { operationTitleTransformer } from '@/features/multisig-operations';
import { graphModel } from '@/features/signing-path';
import { WalletPairingOperationTrigger } from '@/features/wallet-pairing';
import { getDestinationAccountId } from '../lib/get-destination-account-id';
import { draftDeepLinkModel } from '../model/draft-deep-link';

/**
 * Slot for the per-row "view accounts structure" trigger. Drafts owns the slot
 * but never imports `@/features/accounts-structure` directly —
 * accounts-structure registers its own modal here. Direct import would create a
 * module-evaluation cycle: drafts → accounts-structure → wallet-details →
 * flexible-change-signatories → drafts (via InitiateDraftButton).
 */
export const draftAccountsOverviewSlot = createSlot<{
  walletAccounts: AnyAccount[];
  initialChainId: string;
  trigger: ReactNode;
}>();

type DraftRowProps = {
  draft: Draft;
  canWrite: boolean;
  canDelete: boolean;
  isSubmitted: boolean;
  hasInitiator: boolean;
  isHighlighted: boolean;
  multisigAccount: AnyAccount | null;
  rowRef?: (el: HTMLDivElement | null) => void;
  onDelete: (id: string) => void;
  onEdit: (draft: Draft) => void;
  onSubmit: (draft: Draft) => void;
};

export const DraftRow = ({
  draft,
  canWrite,
  canDelete,
  isSubmitted,
  hasInitiator,
  isHighlighted,
  multisigAccount,
  rowRef,
  onDelete,
  onEdit,
  onSubmit,
}: DraftRowProps) => {
  const { t, formatDate } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const chains = useUnit(networkModel.$chains);
  const backendContacts = useUnit(contactModel.$backendContacts);
  const resolveName = useUnit(graphModel.$nameResolver);

  const chain = chains[draft.chainId as ChainId];
  const chainName = chain?.name;
  const contact = backendContacts.find((c) => c.accountId === draft.multisigAccountId);
  const creatorName =
    draft.createdByContact?.name ?? backendContacts.find((c) => c.accountId === draft.createdBy)?.name;
  const creatorAddress = draft.createdBy ? toAddress(draft.createdBy, { prefix: chain?.addressPrefix }) : null;

  const overviewAccount = useMemo<AnyAccount | null>(() => {
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

  const api = useApi(draft.chainId as ChainId);

  const decodedTransaction = useMemo(() => {
    if (!draft.callData || !isHex(draft.callData) || !api || !chain) return null;

    try {
      const nativeAssetId = getNativeAssetId(chain.assets);

      return decodeCallData(
        api,
        (draft.multisigAccountId ?? '') as AccountId,
        draft.callData as CallData,
        nativeAssetId,
      );
    } catch {
      return null;
    }
  }, [draft.callData, draft.multisigAccountId, api, chain]);

  const coreTx = findCoreTransaction(decodedTransaction);
  const destinationAccountId = useMemo(() => getDestinationAccountId(coreTx), [coreTx]);
  const txAsset = useTransactionAsset(coreTx, draft.chainId as ChainId);
  const externalTitle = useTransformer(operationTitleTransformer, {
    operation: decodedTransaction ? ({ transaction: decodedTransaction, chainId: draft.chainId } as never) : null,
    chains,
    asset: txAsset,
    t,
  });

  const titleData = useMemo(() => {
    if (externalTitle?.title) return externalTitle;
    if (!coreTx) return null;

    const amount = getTransactionAmount(coreTx);
    const asset = txAsset ?? chain?.assets[0] ?? null;

    return {
      title: formatSectionAndMethod(coreTx.section, coreTx.method),
      amount: asset && amount ? { value: amount, asset } : undefined,
    };
  }, [externalTitle, coreTx, txAsset, chain]);

  const destinationAddress = destinationAccountId
    ? toAddress(destinationAccountId, { prefix: chain?.addressPrefix })
    : null;

  return (
    <div
      ref={rowRef}
      className={cnTw(
        'mx-0.5 overflow-hidden bg-block-background-default',
        'rounded transition-shadow hover:shadow-card-shadow',
        isHighlighted && 'ring-2 ring-icon-accent',
      )}
    >
      <div className="flex min-h-[52px] w-full min-w-0 items-start px-4 py-2">
        {/* Icon + description */}
        <div className="flex min-w-0 flex-[3] items-start gap-x-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-icon-accent/15">
            <Icon name="document" size={16} className="text-icon-accent" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <FootnoteText className="max-w-[350px] font-medium break-words text-text-primary">
              {draft.description || (
                <span className="text-text-tertiary italic">{t('operations.drafts.noDescription')}</span>
              )}
            </FootnoteText>
            <HelpText className="block truncate text-text-tertiary">
              {(() => {
                let label: ReactNode;

                if (draft.proxyAccountId) {
                  const proxyContact = backendContacts.find((c) => c.accountId === draft.proxyAccountId);
                  label = proxyContact?.name
                    ? proxyContact.name
                    : toShortAddress(toAddress(draft.proxyAccountId, { prefix: chain?.addressPrefix }), 4);
                } else {
                  label = contact?.name || (
                    <span className="text-text-negative">{t('operations.drafts.unknownMultisig')}</span>
                  );
                }

                if (draft.initiatorAccountId) {
                  const initiatorName = resolveName(draft.initiatorAccountId as AccountId, draft.chainId as ChainId);

                  return (
                    <>
                      {label}
                      {' → '}
                      {initiatorName}
                    </>
                  );
                }

                return label;
              })()}
              {titleData?.title && ` · ${titleData.title}`}
              {destinationAddress && ` · ${toShortAddress(destinationAddress, 4)}`}
              {titleData?.amount && (
                <>
                  {}
                  {' · '}
                  <AssetBalance
                    value={titleData.amount.value}
                    asset={titleData.amount.asset}
                    className="!text-help-text !text-text-tertiary"
                  />
                </>
              )}
            </HelpText>
          </div>
        </div>

        {/* Chain + date */}
        <div className="flex min-w-[160px] flex-1 flex-col">
          <FootnoteText className="truncate text-right text-text-primary">
            {chainName || <span className="text-text-negative">{t('operations.drafts.unknownChain')}</span>}
          </FootnoteText>
          <div className="flex min-w-0 items-baseline justify-end gap-x-1 text-help-text text-text-tertiary">
            {(creatorName || creatorAddress) && (
              <>
                <span className="min-w-0 truncate">{creatorName ?? creatorAddress}</span>
                <span className="shrink-0">·</span>
              </>
            )}
            <span className="shrink-0">{formatDate(new Date(draft.createdAt), 'PP')}</span>
          </div>
        </div>

        {/* Draft badge */}
        <div className="mx-3 flex w-[80px] shrink-0 items-center justify-end">
          <div className="flex shrink-0 items-center rounded-[20px] border border-icon-accent/30 bg-icon-accent/8 px-2.5 py-1">
            <CaptionText className="text-icon-accent uppercase">{t('operations.drafts.badge')}</CaptionText>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-x-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex w-[90px] shrink-0 items-center justify-center">
            {overviewAccount && (
              <Slot
                id={draftAccountsOverviewSlot}
                props={{
                  walletAccounts: [overviewAccount],
                  initialChainId: draft.chainId,
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
                    onClick={() => onEdit(draft)}
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
