import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toAccountId, truncate } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, HelpText, Icon, IconButton, SmallTitleText } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { Box, ConfirmModal, Copy, Modal, Tooltip } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { type Draft, type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { useApi } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { draftAccountsOverviewSlot } from '../lib/draft-row-slot';
import { draftDeepLinkModel } from '../model/draft-deep-link';

type Props = {
  draft: Draft;
  chain: Chain | null;
  /** Resolved (or synthetic contact-backed) multisig account, when known. */
  multisigAccount: AnyAccount | null;
  /** Accounts feeding the account-structure overview (proxied first). */
  overviewWalletAccounts: AnyAccount[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (draft: Draft) => void;
  onDelete: (id: string) => void;
};

const PATH_ROLE_KEYS: Record<PathNode['kind'], string> = {
  proxied: 'operations.drafts.pathRoleProxied',
  multisig: 'operations.drafts.pathRoleMultisig',
  signer: 'operations.drafts.pathRoleInitiator',
};

export const DraftFullInfo = ({
  draft,
  chain,
  multisigAccount,
  overviewWalletAccounts,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Props) => {
  const { t, formatDate } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  const api = useApi(draft.chainId);
  const decodedCallData = useMemo(
    () => tryDecodeCallData(draft.callData ?? '', api, chain),
    [draft.callData, api, chain],
  );

  const multisigWallet = multisigAccount ? wallets.find((w) => w.id === multisigAccount.walletId) : undefined;
  const deepLink = draftDeepLinkModel.generateDraftDeepLink(draft.id);

  // The stored signing path is the source of truth; older drafts without one
  // still carry enough fields to reconstruct the hops.
  const pathNodes = useMemo<PathNode[]>(() => {
    if (draft.signingPath.length > 0) return draft.signingPath;

    const nodes: PathNode[] = [];
    if (draft.proxyAccountId) nodes.push({ kind: 'proxied', accountId: toAccountId(draft.proxyAccountId) });
    if (draft.multisigAccountId) nodes.push({ kind: 'multisig', accountId: toAccountId(draft.multisigAccountId) });
    if (draft.initiatorAccountId) nodes.push({ kind: 'signer', accountId: toAccountId(draft.initiatorAccountId) });

    return nodes;
  }, [draft]);

  const createdByName = draft.createdByContact?.name;

  return (
    <div className="grid grid-cols-3">
      <div className="flex flex-col gap-y-4 border-r border-divider p-4">
        <div className="flex items-center justify-between">
          <SmallTitleText>{t('operation.detailsTitle')}</SmallTitleText>
          {canEdit && (
            <Button size="sm" variant="fill" pallet="secondary" onClick={() => onEdit(draft)}>
              {t('operations.drafts.editButton')}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-y-2">
          {chain && (
            <DetailRow label={t('transfer.networkLabel')} className="text-text-secondary">
              <div className="flex items-center gap-x-2">
                <ChainIcon chain={chain} size={16} />
                <FootnoteText>{chain.name}</FootnoteText>
              </div>
            </DetailRow>
          )}

          {draft.multisigAccountId && chain && (
            <DetailRow label={t('operations.drafts.summaryMultisig')} className="text-text-secondary">
              <NamedAccount
                variant="short"
                accountId={toAccountId(draft.multisigAccountId)}
                chain={chain}
                wallet={multisigWallet}
                // Wallet badge defaults to 32px; the surrounding detail rows use
                // 16px identicons, so pin the size to keep addresses aligned.
                iconSize={16}
              />
            </DetailRow>
          )}

          {draft.proxyAccountId && chain && (
            <DetailRow label={t('operations.drafts.proxyLabel')} className="text-text-secondary">
              <NamedAccount
                variant="short"
                accountId={toAccountId(draft.proxyAccountId)}
                chain={chain}
                title={draft.proxyContact?.name}
              />
            </DetailRow>
          )}

          {multisigAccount && accountUtils.isAnyMultisigAccount(multisigAccount) && (
            <DetailRow label={t('operations.drafts.summaryThreshold')} className="text-text-secondary">
              <FootnoteText>
                {t('createMultisigAccount.thresholdOutOf', {
                  threshold: multisigAccount.threshold,
                  signatoriesLength: multisigAccount.signatories.length,
                })}
              </FootnoteText>
            </DetailRow>
          )}

          {(createdByName || draft.createdBy) && (
            <DetailRow label={t('operations.drafts.createdByLabel')} className="text-text-secondary">
              <FootnoteText>{createdByName ?? truncate(draft.createdBy, 6, 6)}</FootnoteText>
            </DetailRow>
          )}

          <DetailRow label={t('operation.details.dateTime')} className="text-text-secondary">
            <FootnoteText>{formatDate(new Date(draft.createdAt), 'PPp')}</FootnoteText>
          </DetailRow>
        </div>

        <div className="flex flex-col gap-y-1.5">
          <FootnoteText className="text-text-tertiary">{t('operations.drafts.descriptionLabel')}</FootnoteText>
          {draft.description ? (
            <FootnoteText className="whitespace-pre-wrap text-text-primary">{draft.description}</FootnoteText>
          ) : (
            <FootnoteText className="text-text-tertiary italic">{t('operations.drafts.noDescription')}</FootnoteText>
          )}
        </div>
      </div>

      <div className="flex flex-col border-r border-divider p-4">
        <div className="mb-4 flex items-center gap-2">
          <SmallTitleText>{t('operations.drafts.stepSigningPath')}</SmallTitleText>

          <span className="flex-1" />

          {overviewWalletAccounts.length > 0 && (
            <Slot
              id={draftAccountsOverviewSlot}
              props={{
                walletAccounts: overviewWalletAccounts,
                initialChainId: draft.chainId,
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
                      <Tooltip.Content>{t('operations.drafts.overviewButton')}</Tooltip.Content>
                    </Tooltip>
                  </div>
                ),
              }}
            />
          )}

          <Tooltip>
            <Tooltip.Trigger>
              <Copy value={deepLink} notification={t('operations.drafts.linkCopied')}>
                <IconButton name="share" className="text-icon-default" />
              </Copy>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('operations.drafts.shareDraftTooltip')}</Tooltip.Content>
          </Tooltip>
        </div>

        <ul className="flex flex-col gap-y-2">
          {pathNodes.map((node) => (
            <li key={`${node.kind}-${node.accountId}`} className="flex items-center gap-x-2">
              <HelpText className="w-[64px] shrink-0 text-text-tertiary uppercase">
                {t(PATH_ROLE_KEYS[node.kind])}
              </HelpText>
              <NamedAccount
                variant="short"
                accountId={node.accountId}
                chain={chain ?? undefined}
                walletNameAs="fallback"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-y-4 p-4">
        <div className="flex items-center justify-between">
          <SmallTitleText>{t('operation.advanced')}</SmallTitleText>
          {canDelete && (
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

        <div className="flex flex-col gap-y-2">
          {draft.callData ? (
            <DetailRow label={t('operation.details.callData')} className="text-text-secondary">
              <div className="flex items-center gap-1">
                <Copy value={draft.callData}>
                  <button
                    type="button"
                    className="group -mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px] hover:bg-action-background-hover hover:text-text-primary"
                  >
                    <FootnoteText className="text-inherit">{truncate(draft.callData, 7, 8)}</FootnoteText>
                    <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
                  </button>
                </Copy>
                {decodedCallData && (
                  <Modal size="lg" height="fit">
                    <Modal.Trigger>
                      <button
                        type="button"
                        className="group cursor-pointer rounded-sm px-2 py-[3px] hover:bg-action-background-hover"
                      >
                        <Icon name="details" size={16} className="group-hover:text-icon-hover" />
                      </button>
                    </Modal.Trigger>
                    <Modal.Title close>{t('operation.viewJSON.label')}</Modal.Title>
                    <Modal.Content>
                      <Box padding={5}>
                        <Json value={decodedCallData} name="callData" />
                      </Box>
                    </Modal.Content>
                  </Modal>
                )}
              </div>
            </DetailRow>
          ) : (
            <FootnoteText className="text-text-tertiary">{t('operations.drafts.summaryNoCallData')}</FootnoteText>
          )}
        </div>
      </div>
    </div>
  );
};
