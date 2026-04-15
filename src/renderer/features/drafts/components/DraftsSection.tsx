import { isHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import {
  type CallData,
  type Chain,
  type ChainId,
  type DecodedTransaction,
  type FlexibleMultisigAccount,
  type MultisigAccount,
} from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatSectionAndMethod, getNativeAssetId, toAccountId, toAddress, truncate } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  Button,
  CaptionText,
  FootnoteText,
  HelpText,
  Icon,
  IconButton,
  InputHint,
  Separator,
  SmallTitleText,
} from '@/shared/ui';
import { AssetBalance, ChainSelect, Hash, Identicon, WalletAccountIcon } from '@/shared/ui-entities';
import {
  Accordion,
  Box,
  ConfirmModal,
  Copy,
  Field,
  Input,
  Modal,
  Select,
  Surface,
  Tabs,
  TextArea,
  Tooltip,
  useNotification,
} from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { type Draft, PERMISSIONS, draftsResource, draftsService, useDrafts } from '@/domains/backend';
import { accounts, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, useApi } from '@/entities/network';
import {
  decodeCallData,
  findCoreTransaction,
  getTransactionAmount,
  getXcmTransactionBeneficiary,
  isTransferTransaction,
  isXcmTransaction,
  transactionService,
  useTransactionAsset,
} from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { ExtrinsicBuilder } from '@/features/extrinsic-builder';
import { type OperationTitle, operationTitleTransformer } from '@/features/multisig-operations';
import { NamedAccount } from '@/widgets/NameResolver';
import '../model/drafts-model'; // side-effect: orchestration wiring
import { submitDraftModel } from '../model/submit-draft-model';

import { SubmitDraftModal } from './SubmitDraftModal';

const enum Step {
  SELECT_MULTISIG,
  CALL_DATA,
  CONFIRM,
}

type MultisigAcc = MultisigAccount | FlexibleMultisigAccount;

const getDestinationAccountId = (coreTx: DecodedTransaction | null): AccountId | null => {
  if (!coreTx) return null;

  if (isXcmTransaction(coreTx)) {
    return getXcmTransactionBeneficiary(coreTx) ?? null;
  }

  if (!isTransferTransaction(coreTx) || !coreTx.args?.dest) return null;

  try {
    return toAccountId(coreTx.args.dest);
  } catch {
    return null;
  }
};

const DraftRow = ({
  draft,
  canWrite,
  canDelete,
  onDelete,
  onEdit,
  onSubmit,
}: {
  draft: Draft;
  canWrite: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onEdit: (draft: Draft) => void;
  onSubmit: (draft: Draft) => void;
}) => {
  const { t, formatDate } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const chains = useUnit(networkModel.$chains);
  const backendContacts = useUnit(contactModel.$backendContacts);

  const chain = chains[draft.chainId as ChainId];
  const chainName = chain?.name;
  const contact = backendContacts.find((c) => c.accountId === draft.multisigAccountId);

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
    <div className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow">
      <div className="flex h-[52px] w-full items-center px-4 py-2">
        {/* Icon + description */}
        <div className="flex min-w-0 flex-1 items-center gap-x-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-icon-accent/15">
            <Icon name="document" size={16} className="text-icon-accent" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <FootnoteText className="truncate font-medium text-text-primary">
              {draft.description || (
                <span className="text-text-tertiary italic">{t('operations.drafts.noDescription')}</span>
              )}
            </FootnoteText>
            <HelpText className="flex items-center truncate text-text-tertiary">
              {contact?.name || <span className="text-text-negative">{t('operations.drafts.unknownMultisig')}</span>}
              {titleData?.title && ` · ${titleData.title}`}
              {destinationAddress && ` · ${truncate(destinationAddress, 4, 4)}`}
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
        <div className="flex w-[120px] shrink-0 flex-col items-end">
          <FootnoteText className="text-text-primary">
            {chainName || <span className="text-text-negative">{t('operations.drafts.unknownChain')}</span>}
          </FootnoteText>
          <HelpText className="text-text-tertiary">{formatDate(new Date(draft.createdAt), 'PP')}</HelpText>
        </div>

        {/* Draft badge */}
        <div className="mx-3 flex w-[80px] shrink-0 items-center justify-end">
          <div className="flex shrink-0 items-center rounded-[20px] border border-icon-accent/30 bg-icon-accent/8 px-2.5 py-1">
            <CaptionText className="text-icon-accent uppercase">{t('operations.drafts.badge')}</CaptionText>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-x-1" onClick={(e) => e.stopPropagation()}>
          {canWrite && (
            <Button size="sm" variant="text" onClick={() => onEdit(draft)}>
              {t('operations.drafts.editButton')}
            </Button>
          )}
          <Tooltip open={isAuthenticated && draft.callData ? false : undefined}>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="fill"
                disabled={!isAuthenticated || !draft.callData}
                onClick={() => onSubmit(draft)}
              >
                {t('operations.drafts.submitButton')}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              {!isAuthenticated ? t('operations.drafts.connectToSubmit') : t('operations.drafts.noCallDataToSubmit')}
            </Tooltip.Content>
          </Tooltip>
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
      </div>
    </div>
  );
};

type DraftSummaryProps = {
  multisigName: string;
  multisigAccountId?: AccountId;
  threshold?: string;
  chain: Chain | null;
  titleData: OperationTitle | null;
  destinationAccountId: AccountId | null;
  callData?: string;
  jsonArgs?: object | null;
};

const DraftSummary = ({
  multisigName,
  multisigAccountId,
  threshold,
  chain,
  titleData,
  destinationAccountId,
  callData,
  jsonArgs,
}: DraftSummaryProps) => {
  const { t } = useI18n();
  const multisigAddress = multisigAccountId
    ? toAddress(multisigAccountId, { prefix: chain?.addressPrefix })
    : undefined;

  return (
    <Surface elevation={1} className="p-4">
      <div className="flex flex-col gap-3">
        <CaptionText className="text-text-tertiary uppercase">{t('operations.drafts.summaryTitle')}</CaptionText>
        <Separator />
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <HelpText className="text-text-tertiary">{t('operations.drafts.summaryMultisig')}</HelpText>
            <div className="flex items-center gap-x-2">
              {multisigAddress && <Identicon address={multisigAddress} size={20} />}
              <FootnoteText className="text-text-primary">{multisigName}</FootnoteText>
            </div>
          </div>
          {chain?.name && (
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">{t('operations.drafts.summaryNetwork')}</HelpText>
              <FootnoteText className="text-text-primary">{chain.name}</FootnoteText>
            </div>
          )}
          {threshold && (
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">{t('operations.drafts.summaryThreshold')}</HelpText>
              <FootnoteText className="text-text-primary">{threshold}</FootnoteText>
            </div>
          )}
          {titleData?.title && (
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">{t('operations.drafts.summaryOperation')}</HelpText>
              <FootnoteText className="text-text-primary">{titleData.title}</FootnoteText>
            </div>
          )}
          {titleData?.amount && (
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">{t('operations.drafts.summaryAmount')}</HelpText>
              <AssetBalance value={titleData.amount.value} asset={titleData.amount.asset} className="text-footnote" />
            </div>
          )}
          {destinationAccountId && chain && (
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">{t('operation.details.recipient')}</HelpText>
              <NamedAccount accountId={destinationAccountId} variant="short" chain={chain} />
            </div>
          )}
          {callData && (
            <div className="flex justify-between">
              <HelpText className="text-text-tertiary">{t('operation.details.callData')}</HelpText>
              <div className="flex items-center gap-1">
                <Copy value={callData}>
                  <button
                    type="button"
                    className="group -mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px] hover:bg-action-background-hover hover:text-text-primary"
                  >
                    <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
                    <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
                  </button>
                </Copy>
                {jsonArgs && (
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
                        <Json value={jsonArgs} name="callData" expandDepth={3} />
                      </Box>
                    </Modal.Content>
                  </Modal>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
};

const EditDraftSummary = ({ draft }: { draft: Draft }) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const backendContacts = useUnit(contactModel.$backendContacts);

  const chain = chains[draft.chainId as ChainId];
  const contact = backendContacts.find((c) => c.accountId === draft.multisigAccountId);
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

  const jsonArgs = useMemo(() => {
    if (!draft.callData || !api || !chain) return null;

    try {
      const call = transactionService.createCallFromCallData(draft.callData as CallData, api);

      return call ? transactionService.formatCall(call, chain) : null;
    } catch {
      return null;
    }
  }, [draft.callData, api, chain]);

  return (
    <DraftSummary
      multisigName={contact?.name ?? draft.multisigAccountId ?? ''}
      multisigAccountId={draft.multisigAccountId as AccountId | undefined}
      chain={chain ?? null}
      titleData={titleData}
      destinationAccountId={destinationAccountId}
      callData={draft.callData ?? undefined}
      jsonArgs={jsonArgs}
    />
  );
};

export const DraftsSection = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);

  const canRead = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_READ) ?? false);
  const canWrite = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_WRITE) ?? false);
  const canDelete = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_DELETE) ?? false);

  const { data: drafts } = useDrafts(canRead ? backendUrl : null);

  const [submittingDraft, setSubmittingDraft] = useState<Draft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDiscardCreate, setShowDiscardCreate] = useState(false);
  const [showDiscardEdit, setShowDiscardEdit] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<Step>(Step.SELECT_MULTISIG);
  const [selectedAccount, setSelectedAccount] = useState<MultisigAcc | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [callData, setCallData] = useState('');
  const [decodedCallData, setDecodedCallData] = useState<object | null>(null);
  const [decodedTransaction, setDecodedTransaction] = useState<DecodedTransaction | null>(null);
  const [description, setDescription] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'build'>('paste');

  const deferredCallData = useDeferredValue(callData);
  const callDataError =
    deferredCallData.length > 0 && !isHex(deferredCallData) ? t('operations.drafts.callDataErrorHex') : null;

  const allAccounts = useUnit(accounts.$list);
  const allMultisigAccounts = useMemo(() => allAccounts.filter(accountUtils.isAnyMultisigAccount), [allAccounts]);
  const allWallets = useUnit(walletModel.$wallets);
  const multisigWallets = useMemo(() => allWallets.filter(walletUtils.isAnyMultisig), [allWallets]);
  const chains = useUnit(networkModel.$chains);
  const chainsList = useUnit(networkModel.$chainsList);
  const backendContacts = useUnit(contactModel.$backendContacts);

  const multisigAccounts = useMemo(() => {
    const backendAccountIds = new Set(backendContacts.map((c) => c.accountId));

    return allMultisigAccounts.filter((account) => backendAccountIds.has(account.accountId));
  }, [allMultisigAccounts, backendContacts]);

  const resolvedWallets = useWalletsNames(multisigWallets);

  const effectiveChain =
    selectedAccount && accountUtils.isFlexibleMultisigAccount(selectedAccount)
      ? (chains[selectedAccount.chainId] ?? null)
      : selectedChain;

  const api = useApi(effectiveChain?.chainId ?? ('0x00' as ChainId));

  const accountOptions = useMemo(() => {
    return multisigAccounts
      .map((account) => {
        const wallet = resolvedWallets.find((w) => w.id === account.walletId);
        if (!wallet) return null;

        const addressPrefix = accountUtils.isFlexibleMultisigAccount(account)
          ? chains[account.chainId]?.addressPrefix
          : undefined;
        const address = toAddress(account.accountId, { prefix: addressPrefix });

        return { account, wallet, address };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);
  }, [multisigAccounts, resolvedWallets, chains]);

  const isCreateDirty = selectedAccount !== null || callData.length > 0 || description.length > 0;

  const resetCreateState = () => {
    setSelectedAccount(null);
    setSelectedChain(null);
    setCallData('');
    setDecodedCallData(null);
    setDecodedTransaction(null);
    setDescription('');
    setActiveStep(Step.SELECT_MULTISIG);
    setIsSubmitting(false);
    setInputMode('paste');
  };

  const handleToggle = (open: boolean) => {
    if (!open && isCreateDirty) {
      setShowDiscardCreate(true);

      return;
    }

    setIsModalOpen(open);
    if (!open) {
      resetCreateState();
    }
  };

  const handleDiscardCreate = () => {
    setShowDiscardCreate(false);
    setIsModalOpen(false);
    resetCreateState();
  };

  const handleCreateDraft = async () => {
    if (!backendUrl || !selectedAccount || !effectiveChain) return;

    setIsSubmitting(true);
    try {
      const response = await draftsService.createDraft(backendUrl, {
        chainId: effectiveChain.chainId,
        multisigAccountId: selectedAccount.accountId,
        callData: callData || undefined,
        description: description || undefined,
      });
      draftsResource.draftCreated(response);
      toast.success(t('operations.drafts.createSuccess'));
      setIsModalOpen(false);
      resetCreateState();
    } catch (e) {
      const message = e instanceof Error ? e.message : t('operations.drafts.createError');
      toast.error(t('operations.drafts.createError'), { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleSubmitDraft = (draft: Draft) => {
    if (!draft.callData || !draft.multisigAccountId) return;

    const chain = chains[draft.chainId as ChainId];
    if (!chain) return;

    const initiatorAccount = allMultisigAccounts.find((a) => a.accountId === draft.multisigAccountId);
    if (!initiatorAccount) return;

    setSubmittingDraft(draft);
    submitDraftModel.flowStarted({ draft, initiator: initiatorAccount, chain });
  };

  const handleSaveEdit = async () => {
    if (!backendUrl || !editingDraft) return;

    setIsSubmitting(true);
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
      setIsSubmitting(false);
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

  const handleAccountChange = (accountId: string) => {
    const found = multisigAccounts.find((a) => a.accountId === accountId) ?? null;
    setSelectedAccount(found);

    if (found && !accountUtils.isFlexibleMultisigAccount(found)) {
      setSelectedChain(chainsList[0] ?? null);
    } else {
      setSelectedChain(null);
    }
  };

  // Auto-decode call data when it changes (same pipeline as operations list)
  useEffect(() => {
    if (!deferredCallData || !isHex(deferredCallData) || !api || !effectiveChain || !selectedAccount) {
      setDecodedCallData(null);
      setDecodedTransaction(null);

      return;
    }

    try {
      // JSON preview via entity transactionService
      const call = transactionService.createCallFromCallData(deferredCallData as CallData, api);
      setDecodedCallData(call ? transactionService.formatCall(call, effectiveChain) : null);

      // Proper DecodedTransaction via the same decoder the operations list uses
      const nativeAssetId = getNativeAssetId(effectiveChain.assets);
      const decoded = decodeCallData(api, selectedAccount.accountId, deferredCallData as CallData, nativeAssetId);
      setDecodedTransaction(decoded);
    } catch {
      setDecodedCallData(null);
      setDecodedTransaction(null);
    }
  }, [deferredCallData, api, effectiveChain, selectedAccount]);

  // Use the same title pipeline as the operations list
  const coreTx = findCoreTransaction(decodedTransaction);
  const destinationAccountId = useMemo(() => getDestinationAccountId(coreTx), [coreTx]);
  const txAsset = useTransactionAsset(coreTx, effectiveChain?.chainId ?? ('0x00' as ChainId));
  const externalTitle = useTransformer(operationTitleTransformer, {
    operation: decodedTransaction
      ? ({ transaction: decodedTransaction, chainId: effectiveChain?.chainId } as never)
      : null,
    chains,
    asset: txAsset,
    t,
  });

  const titleData = useMemo(() => {
    if (externalTitle?.title) return externalTitle;
    if (!coreTx) return null;

    const amount = getTransactionAmount(coreTx);
    const asset = txAsset ?? effectiveChain?.assets[0] ?? null;

    return {
      title: formatSectionAndMethod(coreTx.section, coreTx.method),
      amount: asset && amount ? { value: amount, asset } : undefined,
    };
  }, [externalTitle, coreTx, txAsset, effectiveChain]);

  const selectedAddressPrefix =
    selectedAccount && accountUtils.isFlexibleMultisigAccount(selectedAccount)
      ? chains[selectedAccount.chainId]?.addressPrefix
      : effectiveChain?.addressPrefix;
  const selectedAddress = selectedAccount
    ? toAddress(selectedAccount.accountId, { prefix: selectedAddressPrefix })
    : null;
  const selectedWallet = selectedAccount ? resolvedWallets.find((w) => w.id === selectedAccount.walletId) : null;

  if (!canRead) return null;

  return (
    <div className="mb-6">
      <Accordion>
        <Accordion.Trigger sticky>
          <div className="flex items-center gap-2 py-2">
            <FootnoteText className="font-medium text-text-secondary">{t('operations.drafts.title')}</FootnoteText>
            {drafts.length > 0 && (
              <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-icon-accent/15 px-2">
                <CaptionText className="font-medium text-icon-accent">{drafts.length}</CaptionText>
              </div>
            )}
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="mt-1 flex flex-col gap-y-1.5">
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                canDelete={canDelete}
                canWrite={canWrite}
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
                    onClick={() => canWrite && setIsModalOpen(true)}
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

          <Modal size="md" isOpen={isModalOpen} onToggle={handleToggle}>
            <Modal.Title close>{t('operations.drafts.createNew')}</Modal.Title>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((step, i) => {
                const isCompleted = activeStep > i;
                const isCurrent = activeStep === i;

                return (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={cnTw(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                        isCompleted && 'bg-icon-positive text-white',
                        isCurrent && 'bg-icon-accent text-white',
                        !isCompleted && !isCurrent && 'bg-input-background-disabled text-text-tertiary',
                      )}
                    >
                      {}
                      {isCompleted ? '\u2713' : step}
                    </div>
                    {i < 2 && <div className={cnTw('h-0.5 w-8', isCompleted ? 'bg-icon-positive' : 'bg-divider')} />}
                  </div>
                );
              })}
            </div>
            <Modal.Content>
              {activeStep === Step.SELECT_MULTISIG && (
                <div className="flex flex-col gap-4 p-4">
                  {accountOptions.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Icon name="document" size={32} className="text-icon-default" />
                      <FootnoteText className="text-center text-text-tertiary">
                        {t('operations.drafts.noMultisigsInAddressBook')}
                      </FootnoteText>
                    </div>
                  ) : (
                    <Field text={t('operations.drafts.selectMultisig')}>
                      <Select
                        height="md"
                        placeholder={t('operations.drafts.selectMultisig')}
                        value={selectedAccount?.accountId ?? null}
                        onChange={handleAccountChange}
                      >
                        {accountOptions.map(({ account, wallet, address }) => (
                          <Select.Item key={account.accountId} value={account.accountId}>
                            <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
                              <WalletAccountIcon address={address} type={wallet.type} size={24} iconSize={12} />
                              <span className="flex w-full flex-col overflow-hidden">
                                <span className="w-fit max-w-full truncate">{wallet.name}</span>
                                <span className="w-full text-help-text text-text-tertiary">
                                  <Hash value={address} variant="truncate" />
                                </span>
                              </span>
                            </span>
                          </Select.Item>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {selectedAccount && !accountUtils.isFlexibleMultisigAccount(selectedAccount) && (
                    <Field text={t('operations.drafts.selectNetwork')}>
                      <ChainSelect
                        placeholder={t('operations.drafts.selectNetwork')}
                        value={selectedChain}
                        options={chainsList}
                        onChange={setSelectedChain}
                      />
                    </Field>
                  )}

                  {selectedAccount && effectiveChain && selectedAddress && (
                    <div className="relative rounded-md border border-token-container-border bg-block-background-default p-4 shadow-shadow-2">
                      <div className="flex gap-x-3">
                        <Identicon address={selectedAddress} size={40} />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-body text-text-primary">{selectedWallet?.name}</span>
                          <span className="text-footnote text-text-tertiary">
                            {effectiveChain.name}
                            {}
                            {' · '}
                            {selectedAccount.threshold}/{selectedAccount.signatories.length}
                          </span>
                          <span className="text-help-text text-text-tertiary">
                            <Hash value={selectedAddress} variant="truncate" />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeStep === Step.CALL_DATA && (
                <div className="flex flex-col gap-4 p-4">
                  <Tabs value={inputMode} onChange={(value) => setInputMode(value as 'paste' | 'build')}>
                    <Tabs.List>
                      <Tabs.Trigger value="paste">{t('callData.mode.paste')}</Tabs.Trigger>
                      <Tabs.Trigger value="build">{t('callData.mode.build')}</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="paste">
                      <Field text={t('operations.drafts.callDataLabel')}>
                        <Input
                          height="md"
                          placeholder={t('operations.drafts.callDataPlaceholder')}
                          value={callData}
                          invalid={callDataError !== null}
                          onChange={setCallData}
                        />
                        <InputHint variant="error" active={callDataError !== null}>
                          {callDataError}
                        </InputHint>
                      </Field>
                    </Tabs.Content>
                    <Tabs.Content value="build">
                      <ExtrinsicBuilder
                        api={api}
                        initialCallData={inputMode === 'build' ? callData : undefined}
                        onCallDataChange={(hex) => {
                          if (inputMode === 'build') setCallData(hex ?? '');
                        }}
                      />
                    </Tabs.Content>
                  </Tabs>

                  {decodedCallData && (
                    <div className="flex flex-col gap-y-2">
                      <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
                      <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4 break-all">
                        <Json value={decodedCallData} name="call" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeStep === Step.CONFIRM && (
                <div className="flex flex-col gap-4 p-4">
                  <Field text={t('operations.drafts.descriptionLabel')}>
                    <TextArea
                      placeholder={t('operations.drafts.descriptionPlaceholder')}
                      value={description}
                      rows={3}
                      onChange={setDescription}
                    />
                  </Field>

                  <DraftSummary
                    multisigName={selectedWallet?.name ?? ''}
                    multisigAccountId={selectedAccount?.accountId}
                    threshold={
                      selectedAccount ? `${selectedAccount.threshold}/${selectedAccount.signatories.length}` : undefined
                    }
                    chain={effectiveChain}
                    titleData={titleData}
                    destinationAccountId={destinationAccountId}
                    callData={callData || undefined}
                    jsonArgs={decodedCallData}
                  />
                </div>
              )}
            </Modal.Content>

            <Modal.Footer>
              <div className="flex w-full items-center justify-between">
                <div>
                  {activeStep > Step.SELECT_MULTISIG && (
                    <Button variant="text" onClick={() => setActiveStep((s) => s - 1)}>
                      {t('operations.drafts.backButton')}
                    </Button>
                  )}
                </div>
                <Button
                  disabled={
                    (activeStep === Step.SELECT_MULTISIG && (!selectedAccount || !effectiveChain)) ||
                    (activeStep === Step.CALL_DATA && (callData.length === 0 || callDataError !== null))
                  }
                  isLoading={isSubmitting}
                  onClick={activeStep === Step.CONFIRM ? handleCreateDraft : () => setActiveStep((s) => s + 1)}
                >
                  {activeStep === Step.CONFIRM
                    ? t('operations.drafts.createDraftButton')
                    : t('operations.callData.continueButton')}
                </Button>
              </div>
            </Modal.Footer>
          </Modal>
        </Accordion.Content>
      </Accordion>

      {editingDraft && (
        <Modal size="md" isOpen={isEditModalOpen} onToggle={handleEditToggle}>
          <Modal.Title close>{t('operations.drafts.editDraftTitle')}</Modal.Title>
          <Modal.Content>
            <div className="flex flex-col gap-4 p-4">
              <Field text={t('operations.drafts.descriptionLabel')}>
                <TextArea
                  placeholder={t('operations.drafts.descriptionPlaceholder')}
                  rows={3}
                  value={editDescription}
                  onChange={setEditDescription}
                />
              </Field>

              <EditDraftSummary draft={editingDraft} />
            </div>
          </Modal.Content>
          <Modal.Footer>
            <div className="flex w-full items-center justify-between">
              <Button variant="text" onClick={() => handleEditToggle(false)}>
                {t('operations.drafts.backButton')}
              </Button>
              <Button isLoading={isSubmitting} onClick={handleSaveEdit}>
                {t('operations.drafts.saveButton')}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      )}

      <ConfirmModal
        title={t('operations.drafts.discardTitle')}
        description={t('operations.drafts.discardDescription')}
        cancelText={t('operations.drafts.discardCancel')}
        confirmText={t('operations.drafts.discardConfirm')}
        type="warning"
        isOpen={showDiscardCreate}
        onToggle={setShowDiscardCreate}
        onCancel={() => setShowDiscardCreate(false)}
        onConfirm={handleDiscardCreate}
      />

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
