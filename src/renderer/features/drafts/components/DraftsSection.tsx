import { isHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  type CallData,
  type Chain,
  type ChainId,
  type DecodedTransaction,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type WalletType,
  CryptoType,
} from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import {
  cnTw,
  formatSectionAndMethod,
  getNativeAssetId,
  isEthereumAccountId,
  toAccountId,
  toAddress,
  truncate,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  Button,
  CaptionText,
  DetailRow,
  FootnoteText,
  HelpText,
  Icon,
  IconButton,
  InputHint,
  Separator,
  SmallTitleText,
} from '@/shared/ui';
import {
  Account,
  AssetBalance,
  ChainIcon,
  ChainSelect,
  Hash,
  WalletAccountIcon,
  WalletIcon,
} from '@/shared/ui-entities';
import {
  Accordion,
  Box,
  ConfirmModal,
  Copy,
  Field,
  Input,
  Modal,
  Select,
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
import { type AnyAccount, accounts, contactMultisigsModel, useWalletsNames } from '@/domains/network';
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
import { AccountsStructureModal } from '@/features/accounts-structure';
import { ExtrinsicBuilder } from '@/features/extrinsic-builder';
import { type OperationTitle, operationTitleTransformer } from '@/features/multisig-operations';
import { OperationTemplatesToolbar } from '@/features/operation-templates';
import { WalletPairingOperationTrigger } from '@/features/wallet-pairing';
import { NamedAccount } from '@/widgets/NameResolver';
import { draftDeepLinkModel } from '../model/draft-deep-link';
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
  isSubmitted,
  hasInitiator,
  isHighlighted,
  multisigAccount,
  rowRef,
  onDelete,
  onEdit,
  onSubmit,
}: {
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
}) => {
  const { t, formatDate } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const chains = useUnit(networkModel.$chains);
  const backendContacts = useUnit(contactModel.$backendContacts);

  const chain = chains[draft.chainId as ChainId];
  const chainName = chain?.name;
  const contact = backendContacts.find((c) => c.accountId === draft.multisigAccountId);

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
        'mx-0.5 bg-block-background-default',
        'rounded transition-shadow hover:shadow-card-shadow',
        isHighlighted && 'ring-2 ring-icon-accent',
      )}
    >
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
          {overviewAccount && (
            <div className="flex shrink-0 items-center justify-center">
              <AccountsStructureModal
                walletAccounts={[overviewAccount]}
                initialChainId={draft.chainId}
                trigger={
                  <Button size="sm" variant="text">
                    {t('operations.drafts.overviewButton')}
                  </Button>
                }
              />
            </div>
          )}
          <div className="flex w-[40px] shrink-0 items-center justify-center">
            {canWrite && !isSubmitted && (
              <Button size="sm" variant="text" onClick={() => onEdit(draft)}>
                {t('operations.drafts.editButton')}
              </Button>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-center">
            {isSubmitted ? (
              <div className="flex items-center rounded-[20px] border border-icon-positive/30 bg-icon-positive/8 px-2.5 py-1">
                <CaptionText className="text-icon-positive uppercase">
                  {t('operations.drafts.submittedBadge')}
                </CaptionText>
              </div>
            ) : !hasInitiator ? (
              <WalletPairingOperationTrigger />
            ) : (
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
                  {!isAuthenticated
                    ? t('operations.drafts.connectToSubmit')
                    : t('operations.drafts.noCallDataToSubmit')}
                </Tooltip.Content>
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

type DraftSummaryProps = {
  multisigName: string;
  multisigAccountId?: AccountId;
  threshold?: string;
  chain: Chain | null;
  walletType?: WalletType;
  titleData?: OperationTitle | null;
  destinationAccountId?: AccountId | null;
  callData?: string;
  jsonArgs?: object | null;
};

const DraftSummary = ({
  multisigName,
  multisigAccountId,
  threshold,
  chain,
  walletType,
  titleData,
  destinationAccountId,
  callData,
  jsonArgs,
}: DraftSummaryProps) => {
  const { t } = useI18n();

  return (
    <dl className="flex flex-col gap-y-4 text-footnote">
      {chain?.name && (
        <DetailRow label={t('transfer.networkLabel')} className="flex gap-x-2">
          <ChainIcon chain={chain} size={16} />
          <FootnoteText>{chain.name}</FootnoteText>
        </DetailRow>
      )}
      {walletType && (
        <DetailRow label={t('transaction.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={walletType} size={16} />
          <FootnoteText>{multisigName}</FootnoteText>
        </DetailRow>
      )}
      {!walletType && (
        <DetailRow label={t('transaction.details.wallet')}>
          <FootnoteText>{multisigName}</FootnoteText>
        </DetailRow>
      )}
      {multisigAccountId && chain && (
        <DetailRow label={t('transaction.details.account')}>
          <Account variant="short" accountId={multisigAccountId} chain={chain} title={multisigName} />
        </DetailRow>
      )}
      {threshold && (
        <DetailRow label={t('createMultisigAccount.thresholdName')}>
          <FootnoteText>{threshold}</FootnoteText>
        </DetailRow>
      )}
      {titleData?.title && (
        <DetailRow label={t('operations.drafts.summaryOperation')}>
          <FootnoteText>{titleData.title}</FootnoteText>
        </DetailRow>
      )}
      {titleData?.amount && (
        <DetailRow label={t('operations.drafts.summaryAmount')}>
          <AssetBalance value={titleData.amount.value} asset={titleData.amount.asset} className="text-footnote" />
        </DetailRow>
      )}
      {destinationAccountId && chain && (
        <DetailRow label={t('operation.details.recipient')}>
          <NamedAccount accountId={destinationAccountId} variant="short" chain={chain} />
        </DetailRow>
      )}
      {callData && (
        <DetailRow label={t('operation.details.callData')}>
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
        </DetailRow>
      )}
    </dl>
  );
};

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

  const visibleDrafts = useMemo(() => {
    return drafts.filter((d) => {
      if (linkedDraftIds.has(d.id)) return false;
      if (submittedDraftIds.has(d.id)) return true;

      return true;
    });
  }, [drafts, submittedDraftIds, linkedDraftIds]);

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDiscardCreate, setShowDiscardCreate] = useState(false);
  const [showDiscardEdit, setShowDiscardEdit] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCallData, setEditCallData] = useState('');
  const [editInputMode, setEditInputMode] = useState<'paste' | 'build'>('paste');
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
  const specVersion = api?.runtimeVersion.specVersion.toNumber() ?? null;

  const handleTemplateApply = (templateCallData: string) => {
    setCallData(templateCallData);
  };

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
    setEditCallData(draft.callData ?? '');
    setEditInputMode('paste');
    setIsEditModalOpen(true);
  };

  // Edit-mode derived state
  const editChain = editingDraft ? (chains[editingDraft.chainId as ChainId] ?? null) : null;
  const editAccount = editingDraft
    ? (allMultisigAccounts.find((a) => a.accountId === editingDraft.multisigAccountId) ?? null)
    : null;
  const editWallet = editAccount ? (resolvedWallets.find((w) => w.id === editAccount.walletId) ?? null) : null;
  const editApi = useApi((editingDraft?.chainId as ChainId) ?? ('0x00' as ChainId));
  const editSpecVersion = editApi?.runtimeVersion.specVersion.toNumber() ?? null;

  const deferredEditCallData = useDeferredValue(editCallData);
  const editCallDataError =
    deferredEditCallData.length > 0 && !isHex(deferredEditCallData) ? t('operations.drafts.callDataErrorHex') : null;

  const editDecodedCallData = useMemo(() => {
    if (!deferredEditCallData || !isHex(deferredEditCallData) || !editApi || !editChain) return null;

    try {
      const call = transactionService.createCallFromCallData(deferredEditCallData as CallData, editApi);

      return call ? transactionService.formatCall(call, editChain) : null;
    } catch {
      return null;
    }
  }, [deferredEditCallData, editApi, editChain]);

  const handleEditTemplateApply = (templateCallData: string) => {
    setEditCallData(templateCallData);
  };

  const handleSubmitDraft = (draft: Draft) => {
    if (!draft.callData || !draft.multisigAccountId) return;

    const chain = chains[draft.chainId as ChainId];
    if (!chain) return;

    const initiatorAccount = allMultisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null;

    setSubmittingDraft(draft);
    submitDraftModel.flowStarted({ draft, initiator: initiatorAccount, chain });
  };

  const handleSaveEdit = async () => {
    if (!backendUrl || !editingDraft) return;

    setIsSubmitting(true);
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
      setIsSubmitting(false);
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

  const selectedWallet = selectedAccount ? resolvedWallets.find((w) => w.id === selectedAccount.walletId) : null;

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
                hasInitiator={allMultisigAccounts.some((a) => a.accountId === draft.multisigAccountId)}
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
              {[
                { step: 1, label: t('operations.drafts.stepMultisig') },
                { step: 2, label: t('operations.drafts.stepCallData') },
                { step: 3, label: t('operations.drafts.stepConfirm') },
              ].map(({ step, label }, i) => {
                const isCompleted = activeStep > i;
                const isCurrent = activeStep === i;

                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={cnTw(
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                          isCompleted && 'bg-icon-positive text-white',
                          isCurrent && 'bg-icon-accent text-white',
                          !isCompleted && !isCurrent && 'bg-input-background-disabled text-text-tertiary',
                        )}
                      >
                        {isCompleted ? '\u2713' : step}
                      </div>
                      <CaptionText
                        className={cnTw(
                          'transition-colors',
                          isCurrent || isCompleted ? 'text-text-secondary' : 'text-text-tertiary',
                        )}
                      >
                        {label}
                      </CaptionText>
                    </div>
                    {i < 2 && (
                      <div className={cnTw('mb-5 h-0.5 w-8', isCompleted ? 'bg-icon-positive' : 'bg-divider')} />
                    )}
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
                </div>
              )}

              {activeStep === Step.CALL_DATA && (
                <div className="flex min-h-[500px] flex-col gap-4 p-4">
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

                  {effectiveChain && (
                    <OperationTemplatesToolbar
                      api={api}
                      chainId={effectiveChain.chainId}
                      callData={callData}
                      specVersion={specVersion}
                      onApply={handleTemplateApply}
                    />
                  )}

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
                    walletType={selectedWallet?.type}
                    threshold={
                      selectedAccount
                        ? t('createMultisigAccount.thresholdOutOf', {
                            threshold: selectedAccount.threshold,
                            signatoriesLength: selectedAccount.signatories.length,
                          })
                        : undefined
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

            <Modal.Footer align="between">
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
                  (activeStep === Step.CALL_DATA && callDataError !== null)
                }
                isLoading={isSubmitting}
                onClick={activeStep === Step.CONFIRM ? handleCreateDraft : () => setActiveStep((s) => s + 1)}
              >
                {activeStep === Step.CONFIRM
                  ? t('operations.drafts.createDraftButton')
                  : t('operations.callData.continueButton')}
              </Button>
            </Modal.Footer>
          </Modal>
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
              </Field>

              <Separator />

              <DraftSummary
                multisigName={editWallet?.name ?? ''}
                multisigAccountId={editAccount?.accountId}
                walletType={editWallet?.type}
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
            <Button disabled={editCallDataError !== null} isLoading={isSubmitting} onClick={handleSaveEdit}>
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
