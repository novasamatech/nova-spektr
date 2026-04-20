import { isHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAccountId } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import {
  Accordion,
  ConfirmModal,
  Field,
  Input,
  Modal,
  Tabs,
  TextArea,
  Tooltip,
  useNotification,
} from '@/shared/ui-kit';
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
import { ExtrinsicBuilder } from '@/features/extrinsic-builder';
import { OperationTemplatesToolbar } from '@/features/operation-templates';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { createDraftModel } from '../model/create-draft-model';
import { draftDeepLinkModel } from '../model/draft-deep-link';
import '../model/drafts-model'; // side-effect: orchestration wiring
import { submitDraftModel } from '../model/submit-draft-model';

import { DraftRow } from './DraftRow';
import { DraftSummary } from './DraftSummary';
import { SubmitDraftModal } from './SubmitDraftModal';

export const DraftsSection = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);
  const focusedDraftId = useUnit(draftDeepLinkModel.$focusedDraftId);

  const canRead = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_READ) ?? false);
  const canWrite = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_WRITE) ?? false);
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
  const [editCallData, setEditCallData] = useState('');
  const [editInputMode, setEditInputMode] = useState<'paste' | 'build'>('paste');
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
    setEditCallData(draft.callData ?? '');
    setEditInputMode('paste');
    setIsEditModalOpen(true);
  };

  // Edit-mode derived state
  const editChain = editingDraft ? (chains[editingDraft.chainId as ChainId] ?? null) : null;
  const editAccount = editingDraft
    ? (allMultisigAccounts.find((a) => a.accountId === editingDraft.multisigAccountId) ?? null)
    : null;
  const editFlexWallet = useMemo(() => {
    if (!editingDraft?.proxyAccountId || !allWallets.length) return null;

    return walletUtils.getWalletFilteredAccounts(allWallets, {
      walletFn: (w) => walletUtils.isFlexibleMultisig(w),
      accountFn: (a) =>
        accountUtils.isFlexibleMultisigAccount(a) &&
        a.accountId === editingDraft.proxyAccountId &&
        a.multisigAccountId === editingDraft.multisigAccountId,
    });
  }, [editingDraft, allWallets]);
  const isEditFlex = !!editFlexWallet;
  const editWallet = isEditFlex
    ? (resolvedWallets.find((w) => w.id === editFlexWallet.id) ?? editFlexWallet)
    : editAccount
      ? (resolvedWallets.find((w) => w.id === editAccount.walletId) ?? null)
      : null;
  const editApi = useApi((editingDraft?.chainId as ChainId) ?? ('0x00' as ChainId));
  const editSpecVersion = editApi?.runtimeVersion.specVersion.toNumber() ?? null;

  const deferredEditCallData = useDeferredValue(editCallData);

  const editDecodedCallData = useMemo(
    () => tryDecodeCallData(deferredEditCallData, editApi, editChain),
    [deferredEditCallData, editApi, editChain],
  );

  const isEditCallDataUndecodable =
    deferredEditCallData.length > 0 && isHex(deferredEditCallData) && !!editApi && !!editChain && !editDecodedCallData;

  const editCallDataError = (() => {
    if (deferredEditCallData.length > 0 && !isHex(deferredEditCallData)) {
      return t('operations.drafts.callDataErrorHex');
    }
    if (isEditCallDataUndecodable) {
      return t('operations.drafts.extrinsicError');
    }

    return null;
  })();

  const handleEditTemplateApply = (templateCallData: string) => {
    setEditCallData(templateCallData);
  };

  const handleSubmitDraft = (draft: Draft) => {
    if (!draft.callData || !draft.multisigAccountId) return;

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
        callData: editCallData || undefined,
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

  const isEditDirty =
    editingDraft !== null &&
    (editDescription !== (editingDraft.description ?? '') || editCallData !== (editingDraft.callData ?? ''));

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

  if (!canRead) return null;

  return (
    <div className="mb-6">
      <Accordion open={focusedDraftId ? true : undefined}>
        <Accordion.Trigger sticky>
          <div className="flex items-center gap-2 py-2">
            <FootnoteText className="font-medium text-text-secondary">{t('operations.drafts.title')}</FootnoteText>
            {visibleDrafts.length > 0 && (
              <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-icon-accent/15 px-2">
                <CaptionText className="font-medium text-icon-accent">{visibleDrafts.length}</CaptionText>
              </div>
            )}
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="mt-1 flex flex-col gap-y-1.5">
            {visibleDrafts.map((draft) => (
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
              <Tooltip.Content>
                {isAuthenticated ? t('operations.drafts.noWritePermission') : t('operations.drafts.connectToCreate')}
              </Tooltip.Content>
            </Tooltip>
          </div>
        </Accordion.Content>
      </Accordion>

      {editingDraft && (
        <Modal size="md" isOpen={isEditModalOpen} onToggle={handleEditToggle}>
          <Modal.Title close>{t('operations.drafts.editDraftTitle')}</Modal.Title>
          <Modal.Content>
            <div className="flex flex-col gap-4 p-4">
              <Tabs value={editInputMode} onChange={(value) => setEditInputMode(value as 'paste' | 'build')}>
                <Tabs.List>
                  <Tabs.Trigger value="paste">{t('callData.mode.paste')}</Tabs.Trigger>
                  <Tabs.Trigger value="build">{t('callData.mode.build')}</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="paste">
                  <Field text={t('operations.drafts.callDataLabel')}>
                    <Input
                      height="md"
                      placeholder={t('operations.drafts.callDataPlaceholder')}
                      value={editCallData}
                      invalid={editCallDataError !== null}
                      onChange={setEditCallData}
                    />
                    <InputHint variant="error" active={editCallDataError !== null}>
                      {editCallDataError}
                    </InputHint>
                  </Field>
                </Tabs.Content>
                <Tabs.Content value="build">
                  <ExtrinsicBuilder
                    api={editApi}
                    initialCallData={editInputMode === 'build' ? editCallData : undefined}
                    onCallDataChange={(hex) => {
                      if (editInputMode === 'build') setEditCallData(hex ?? '');
                    }}
                  />
                </Tabs.Content>
              </Tabs>

              {editCallDataError && editInputMode === 'build' && (
                <InputHint variant="error" active>
                  {editCallDataError}
                </InputHint>
              )}

              {editChain && (
                <OperationTemplatesToolbar
                  api={editApi}
                  chainId={editChain.chainId}
                  callData={editCallData}
                  specVersion={editSpecVersion}
                  onApply={handleEditTemplateApply}
                />
              )}

              {editDecodedCallData && (
                <div className="flex flex-col gap-y-2">
                  <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
                  <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4 break-all">
                    <Json value={editDecodedCallData} name="call" />
                  </div>
                </div>
              )}

              <Field text={t('operations.drafts.descriptionLabel')}>
                <TextArea
                  placeholder={t('operations.drafts.descriptionPlaceholder')}
                  rows={3}
                  value={editDescription}
                  onChange={setEditDescription}
                />
                <InputHint variant="error" active={!editDescription.trim()}>
                  {t('operations.drafts.descriptionRequired')}
                </InputHint>
              </Field>

              <Separator />

              <DraftSummary
                multisigName={editWallet?.name ?? ''}
                multisigAccountId={isEditFlex ? editFlexWallet?.accounts[0]?.accountId : editAccount?.accountId}
                walletType={editWallet?.type}
                proxyName={isEditFlex ? undefined : (editingDraft?.proxyContact?.name ?? undefined)}
                proxyAccountId={
                  !isEditFlex && editingDraft?.proxyAccountId ? toAccountId(editingDraft.proxyAccountId) : undefined
                }
                threshold={
                  editAccount
                    ? t('createMultisigAccount.thresholdOutOf', {
                        threshold: editAccount.threshold,
                        signatoriesLength: editAccount.signatories.length,
                      })
                    : undefined
                }
                chain={editChain}
              />
            </div>
          </Modal.Content>
          <Modal.Footer align="between">
            <Button variant="text" onClick={() => handleEditToggle(false)}>
              {t('operations.drafts.backButton')}
            </Button>
            <Button
              disabled={editCallDataError !== null || !editDescription.trim()}
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
