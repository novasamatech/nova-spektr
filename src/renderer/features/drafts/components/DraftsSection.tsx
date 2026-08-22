import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAccountId } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import { ConfirmModal, Field, Modal, TextArea, Tooltip, useNotification } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { type Draft, draftsResource, draftsService } from '@/domains/backend';
import { accounts, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, useApi } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { backendConfigurationModel } from '@/aggregates/backend';
import { AddressBookHealthOverlay } from '@/features/contacts';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { resolveDraftProxyAccount } from '../lib/draft-account-resolution';
import { type DraftListScope } from '../lib/draft-scope';
import { useCanCreateDraft } from '../lib/useCanCreateDraft';
import { useDraftsSectionState } from '../lib/useDraftsSectionState';
import { useSubmitDraft } from '../lib/useSubmitDraft';
import { DESCRIPTION_MAX_LENGTH, createDraftModel } from '../model/create-draft-model';
import { draftDeepLinkModel } from '../model/draft-deep-link';
import '../model/drafts-model'; // side-effect: orchestration wiring
import { submitDraftModel } from '../model/submit-draft-model';

import { DraftRow } from './DraftRow';
import { DraftSummary } from './DraftSummary';

type Props = {
  /** Narrows drafts to the Operations view's active non-status filters. */
  scope?: DraftListScope;
  /**
   * The heading lives in the Operations view (above the sticky column header);
   * it owns the collapse state.
   */
  isCollapsed: boolean;
};

export const DraftsSection = ({ scope, isCollapsed }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);
  const focusedDraftId = useUnit(draftDeepLinkModel.$focusedDraftId);

  // Same hook the Operations view uses for the heading, so "does the group render"
  // and "which rows does it hold" have one source of truth.
  const { isAvailable, isHealthy, drafts: visibleDrafts } = useDraftsSectionState(scope);

  const canWrite = useCanCreateDraft();
  // Deleting a draft is write-gated: the backend dropped the dedicated
  // `operation-draft:delete` permission (DELETE endpoint checks `:write`).
  const canDelete = canWrite;

  const submittedDraftIds = useUnit(submitDraftModel.$submittedDraftIds);

  const sortedDrafts = useMemo(
    () => [...visibleDrafts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [visibleDrafts],
  );

  // Deep link: scroll-to and highlight
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!focusedDraftId || !highlightedRef.current) return;

    const timer = setTimeout(() => {
      highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    return () => clearTimeout(timer);
  }, [focusedDraftId]);

  useEffect(() => {
    if (!focusedDraftId) return;

    const clear = () => draftDeepLinkModel.focusCleared();
    const timer = setTimeout(() => {
      document.addEventListener('click', clear, { once: true });
    }, 200);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', clear);
    };
  }, [focusedDraftId]);

  const { submitDraft, modal: submitDraftModalNode } = useSubmitDraft();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDiscardEdit, setShowDiscardEdit] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const allAccounts = useUnit(accounts.$list);
  const allMultisigAccounts = useMemo(() => allAccounts.filter(accountUtils.isAnyMultisigAccount), [allAccounts]);
  const allWallets = useUnit(walletModel.$wallets);
  const multisigWallets = useMemo(() => allWallets.filter(walletUtils.isAnyMultisig), [allWallets]);
  const chains = useUnit(networkModel.$chains);
  const backendContacts = useUnit(contactModel.$backendContacts);
  const draftProxyAccounts = useMemo(() => {
    const resolved = new Map<Draft['id'], ReturnType<typeof resolveDraftProxyAccount>>();

    for (const draft of visibleDrafts) {
      if (draft.proxyAccountId) {
        resolved.set(draft.id, resolveDraftProxyAccount(draft, allAccounts, backendContacts));
      }
    }

    return resolved;
  }, [visibleDrafts, allAccounts, backendContacts]);

  const resolvedWallets = useWalletsNames(multisigWallets);

  const handleDeleteDraft = async (id: string) => {
    if (!backendUrl) return;

    try {
      await draftsService.deleteDraft(backendUrl, id);
      draftsResource.draftDeleted(id);
      toast.success(t('operations.drafts.deleteSuccess'));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('operations.drafts.deleteError');
      toast.error(t('operations.drafts.deleteError'), { description: message });
    }
  };

  // A draft without a signing path can't be submitted, so the way forward is a
  // new one seeded from it: same chain, same call, same note — the author only
  // re-picks how it gets signed.
  const handleRecreateDraft = (draft: Draft) => {
    createDraftModel.createDraftRequested({
      chainId: draft.chainId,
      callData: draft.callData ?? undefined,
      description: draft.description ?? undefined,
      inputMode: 'paste',
      source: 'drafts-recreate',
    });
  };

  const handleEditDraft = (draft: Draft) => {
    setEditingDraft(draft);
    setEditDescription(draft.description ?? '');
    setIsEditModalOpen(true);
  };

  // Edit-mode derived state
  const draftChain = editingDraft ? (chains[editingDraft.chainId as ChainId] ?? null) : null;
  const draftAccount = editingDraft
    ? (allMultisigAccounts.find((a) => a.accountId === editingDraft.multisigAccountId) ?? null)
    : null;
  const draftFlexWallet = useMemo(() => {
    if (!editingDraft?.proxyAccountId || !allWallets.length) return null;

    return walletUtils.getWalletFilteredAccounts(allWallets, {
      walletFn: (w) => walletUtils.isFlexibleMultisig(w),
      accountFn: (a) =>
        accountUtils.isFlexibleMultisigAccount(a) &&
        a.accountId === editingDraft.proxyAccountId &&
        a.multisigAccountId === editingDraft.multisigAccountId,
    });
  }, [editingDraft, allWallets]);
  const isDraftFlex = !!draftFlexWallet;
  const draftWallet = isDraftFlex
    ? (resolvedWallets.find((w) => w.id === draftFlexWallet.id) ?? draftFlexWallet)
    : draftAccount
      ? (resolvedWallets.find((w) => w.id === draftAccount.walletId) ?? null)
      : null;
  const draftApi = useApi((editingDraft?.chainId as ChainId) ?? ('0x00' as ChainId));

  const decodedCallData = useMemo(
    () => tryDecodeCallData(editingDraft?.callData ?? '', draftApi, draftChain),
    [editingDraft?.callData, draftApi, draftChain],
  );

  const handleSaveEdit = async () => {
    if (!backendUrl || !editingDraft) return;

    setIsSavingEdit(true);
    try {
      const response = await draftsService.updateDraft(backendUrl, editingDraft.id, {
        description: editDescription,
      });
      draftsResource.draftUpdated(response);
      toast.success(t('operations.drafts.editSuccess'));
      setIsEditModalOpen(false);
      setEditingDraft(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : t('operations.drafts.editError');
      toast.error(t('operations.drafts.editError'), { description: message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isEditDirty = editingDraft !== null && editDescription !== (editingDraft.description ?? '');

  const handleEditToggle = (open: boolean) => {
    if (!open && isEditDirty) {
      setShowDiscardEdit(true);

      return;
    }

    setIsEditModalOpen(open);
    if (!open) setEditingDraft(null);
  };

  const handleDiscardEdit = () => {
    setShowDiscardEdit(false);
    setIsEditModalOpen(false);
    setEditingDraft(null);
  };

  if (!isAvailable) return null;

  return (
    <div>
      <AddressBookHealthOverlay isHealthy={isHealthy}>
        <div aria-hidden={!isHealthy} inert={!isHealthy || undefined}>
          {!isCollapsed && (
            <div className="flex flex-col gap-y-1.5">
              {isHealthy &&
                sortedDrafts.map((draft) => (
                  <DraftRow
                    key={draft.id}
                    canDelete={canDelete}
                    canWrite={canWrite}
                    isSubmitted={submittedDraftIds.has(draft.id)}
                    hasInitiator={
                      draft.proxyAccountId
                        ? allAccounts.some((a) => a.accountId === draft.proxyAccountId)
                        : allMultisigAccounts.some((a) => a.accountId === draft.multisigAccountId)
                    }
                    isHighlighted={focusedDraftId === draft.id}
                    multisigAccount={allMultisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null}
                    proxyAccount={draft.proxyAccountId ? (draftProxyAccounts.get(draft.id) ?? null) : null}
                    rowRef={
                      focusedDraftId === draft.id
                        ? (el) => {
                            highlightedRef.current = el;
                          }
                        : undefined
                    }
                    draft={draft}
                    onDelete={handleDeleteDraft}
                    onEdit={handleEditDraft}
                    onSubmit={submitDraft}
                    onRecreate={handleRecreateDraft}
                  />
                ))}

              <Tooltip open={canWrite ? false : undefined}>
                <Tooltip.Trigger>
                  <div>
                    <button
                      className={cnTw(
                        'group flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-shade-12 transition-all',
                        canWrite
                          ? 'cursor-pointer hover:border-icon-accent hover:bg-icon-accent/4 active:scale-[0.998]'
                          : 'cursor-not-allowed opacity-50',
                      )}
                      disabled={!canWrite}
                      type="button"
                      onClick={() => canWrite && createDraftModel.createDraftRequested()}
                    >
                      <Icon
                        name="add"
                        size={14}
                        className="text-text-tertiary transition-colors group-hover:text-icon-accent"
                      />
                      <FootnoteText className="font-medium text-text-tertiary transition-colors group-hover:text-icon-accent">
                        {t('operations.drafts.createNew')}
                      </FootnoteText>
                    </button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('operations.drafts.noWritePermission')}</Tooltip.Content>
              </Tooltip>
            </div>
          )}
        </div>
      </AddressBookHealthOverlay>

      {editingDraft && (
        <Modal size="md" isOpen={isEditModalOpen} onToggle={handleEditToggle}>
          <Modal.Title close>{t('operations.drafts.editDraftTitle')}</Modal.Title>
          <Modal.Content>
            <div className="flex flex-col gap-4 p-4">
              {decodedCallData && (
                <div className="flex flex-col gap-y-2">
                  <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
                  <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4 break-all">
                    <Json value={decodedCallData} name="call" />
                  </div>
                </div>
              )}

              <Field text={t('operations.drafts.descriptionLabel')}>
                <TextArea
                  placeholder={t('operations.drafts.descriptionPlaceholder')}
                  rows={3}
                  value={editDescription}
                  invalid={editDescription.length > DESCRIPTION_MAX_LENGTH}
                  onChange={setEditDescription}
                />
                <InputHint variant="error" active={!editDescription.trim()}>
                  {t('operations.drafts.descriptionRequired')}
                </InputHint>
                <InputHint variant="error" active={editDescription.length > DESCRIPTION_MAX_LENGTH}>
                  {t('operations.drafts.descriptionMaxLengthError', { max: DESCRIPTION_MAX_LENGTH })}
                </InputHint>
              </Field>

              <Separator />

              <DraftSummary
                multisigName={draftWallet?.name ?? ''}
                multisigAccountId={isDraftFlex ? draftFlexWallet?.accounts[0]?.accountId : draftAccount?.accountId}
                walletType={draftWallet?.type}
                proxyName={isDraftFlex ? undefined : (editingDraft?.proxyContact?.name ?? undefined)}
                proxyAccountId={
                  !isDraftFlex && editingDraft?.proxyAccountId ? toAccountId(editingDraft.proxyAccountId) : undefined
                }
                threshold={
                  draftAccount
                    ? t('createMultisigAccount.thresholdOutOf', {
                        threshold: draftAccount.threshold,
                        signatoriesLength: draftAccount.signatories.length,
                      })
                    : undefined
                }
                chain={draftChain}
              />
            </div>
          </Modal.Content>
          <Modal.Footer align="between">
            <Button variant="text" onClick={() => handleEditToggle(false)}>
              {t('operations.drafts.backButton')}
            </Button>
            <Button
              disabled={!editDescription.trim() || editDescription.length > DESCRIPTION_MAX_LENGTH || !isEditDirty}
              isLoading={isSavingEdit}
              onClick={handleSaveEdit}
            >
              {t('operations.drafts.saveButton')}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      <ConfirmModal
        title={t('operations.drafts.discardTitle')}
        description={t('operations.drafts.discardDescription')}
        cancelText={t('operations.drafts.discardCancel')}
        confirmText={t('operations.drafts.discardConfirm')}
        type="warning"
        isOpen={showDiscardEdit}
        onToggle={setShowDiscardEdit}
        onCancel={() => setShowDiscardEdit(false)}
        onConfirm={handleDiscardEdit}
      />

      {submitDraftModalNode}
    </div>
  );
};
