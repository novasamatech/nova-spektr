import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAccountId } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import { Accordion, ConfirmModal, Field, Modal, TextArea, Tooltip, useNotification } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import {
  type Draft,
  PERMISSIONS,
  draftsResource,
  draftsService,
  operationDescriptionsResource,
  useDrafts,
} from '@/domains/backend';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel, useApi } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { useCanCreateDraft } from '../lib/useCanCreateDraft';
import { DESCRIPTION_MAX_LENGTH, createDraftModel } from '../model/create-draft-model';
import { draftDeepLinkModel } from '../model/draft-deep-link';
import '../model/drafts-model'; // side-effect: orchestration wiring
import { submitDraftModel } from '../model/submit-draft-model';

import { AddressBookHealthOverlay } from './AddressBookHealthOverlay';
import { DraftRow } from './DraftRow';
import { DraftSummary } from './DraftSummary';
import { SubmitDraftModal } from './SubmitDraftModal';

export const DraftsSection = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const focusedDraftId = useUnit(draftDeepLinkModel.$focusedDraftId);

  const canRead = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_READ) ?? false);
  const canWrite = useCanCreateDraft();
  const canDelete = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_DELETE) ?? false);

  const { data: drafts } = useDrafts(canRead ? backendUrl : null);
  const submittedDraftIds = useUnit(submitDraftModel.$submittedDraftIds);
  const linkedDraftIds = useUnit(operationDescriptionsResource.$linkedDraftIds);
  const operationsLoaded = useUnit(operationDescriptionsResource.$operationsLoaded);

  const visibleDrafts = useMemo(() => {
    if (!operationsLoaded) return [];

    return drafts.filter((d) => {
      if (linkedDraftIds.has(d.id)) return false;
      if (submittedDraftIds.has(d.id)) return true;

      return true;
    });
  }, [drafts, submittedDraftIds, linkedDraftIds, operationsLoaded]);

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

  const [submittingDraft, setSubmittingDraft] = useState<Draft | null>(null);
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

  const handleSubmitDraft = (draft: Draft) => {
    if (!draft.multisigAccountId) return;

    const chain = chains[draft.chainId as ChainId];
    if (!chain) return;

    // For flex drafts, the routing initiator is the proxied (pure proxy) account,
    // but the display initiator is the flex multisig account
    const initiatorAccount = draft.proxyAccountId
      ? (allAccounts.find((a) => a.accountId === draft.proxyAccountId) ?? null)
      : (allMultisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null);

    const displayInitiator = draft.proxyAccountId
      ? (allMultisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null)
      : undefined;

    setSubmittingDraft(draft);
    submitDraftModel.flowStarted({ draft, initiator: initiatorAccount, displayInitiator, chain });
  };

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

  if (isHealthy && !canRead) return null;

  return (
    <div className="mb-6">
      <AddressBookHealthOverlay isHealthy={isHealthy}>
        <div aria-hidden={!isHealthy} inert={!isHealthy || undefined}>
          <Accordion initialOpen>
            <Accordion.Trigger sticky>
              <div className="flex items-center gap-2 py-2">
                <FootnoteText className="font-medium text-text-secondary">{t('operations.drafts.title')}</FootnoteText>
                {isHealthy && visibleDrafts.length > 0 && (
                  <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-icon-accent/15 px-2">
                    <CaptionText className="font-medium text-icon-accent">{visibleDrafts.length}</CaptionText>
                  </div>
                )}
              </div>
            </Accordion.Trigger>
            <Accordion.Content>
              <div className="mt-1 flex flex-col gap-y-1.5">
                {isHealthy &&
                  visibleDrafts.map((draft) => (
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
                      proxyAccount={
                        draft.proxyAccountId
                          ? (allAccounts.find((a) => a.accountId === draft.proxyAccountId) ?? null)
                          : null
                      }
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
                      onSubmit={handleSubmitDraft}
                    />
                  ))}

                <Tooltip open={canWrite ? false : undefined}>
                  <Tooltip.Trigger>
                    <div>
                      <button
                        className={cnTw(
                          'group w-full rounded-lg border-2 border-dashed border-shade-12 px-4 py-3.5 transition-all',
                          canWrite
                            ? 'cursor-pointer hover:border-icon-accent hover:bg-icon-accent/4 active:scale-[0.998]'
                            : 'cursor-not-allowed opacity-50',
                        )}
                        disabled={!canWrite}
                        type="button"
                        onClick={() => canWrite && createDraftModel.createDraftRequested()}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-shade-12 transition-colors group-hover:border-icon-accent group-hover:bg-icon-accent/10">
                            <Icon
                              name="add"
                              size={14}
                              className="text-text-tertiary transition-colors group-hover:text-icon-accent"
                            />
                          </div>
                          <FootnoteText className="font-medium text-text-tertiary transition-colors group-hover:text-icon-accent">
                            {t('operations.drafts.createNew')}
                          </FootnoteText>
                        </div>
                      </button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('operations.drafts.noWritePermission')}</Tooltip.Content>
                </Tooltip>
              </div>
            </Accordion.Content>
          </Accordion>
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

      {submittingDraft && <SubmitDraftModal onClose={() => setSubmittingDraft(null)} />}
    </div>
  );
};
