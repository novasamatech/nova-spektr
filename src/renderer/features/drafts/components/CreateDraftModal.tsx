import { useUnit } from 'effector-react';
import { type ReactElement, useDeferredValue, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, isHex, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { ConfirmModal, Modal, Tooltip, useNotification } from '@/shared/ui-kit';
import { draftsResource, draftsService } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import { networkModel, useApi } from '@/entities/network';
import { findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { backendConfigurationModel } from '@/aggregates/backend';
import { operationIconTransformer, operationTitleTransformer } from '@/features/multisig-operations';
import {
  type PathNextOption,
  type PathSource,
  StepPath,
  deriveInitiatorAccountId,
  deriveMultisigAccountId,
  graphModel,
  isUsablePath,
  isValidPath,
  pathModel,
} from '@/features/signing-path';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { createDraftModel } from '../model/create-draft-model';
import { StepReview } from '../steps/StepReview';
import { StepTransaction } from '../steps/StepTransaction';

import { StepIndicator } from './StepIndicator';

export const CreateDraftModal = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardCreate, setShowDiscardCreate] = useState(false);

  const isOpen = useUnit(createDraftModel.$isOpen);
  const activeStep = useUnit(createDraftModel.$activeStep);
  const selectedChain = useUnit(createDraftModel.$selectedChain);
  const callData = useUnit(createDraftModel.$callData);
  const description = useUnit(createDraftModel.$description);
  const inputMode = useUnit(createDraftModel.$inputMode);
  const callDataErrorKey = useUnit(createDraftModel.$callDataErrorKey);
  const isDirty = useUnit(createDraftModel.$isDirty);
  const canContinue = useUnit(createDraftModel.$canContinue);
  const canSkip = useUnit(createDraftModel.$canSkip);
  const isRiskAcknowledged = useUnit(createDraftModel.$isRiskAcknowledged);
  const decodedTransaction = useUnit(createDraftModel.$decodedTransaction);
  const destinationAccountId = useUnit(createDraftModel.$destinationAccountId);
  const recipientWarning = useUnit(createDraftModel.$recipientWarning);
  const isRecipientCheckable = useUnit(createDraftModel.$isRecipientCheckable);
  const isRecipientRiskAccepted = useUnit(createDraftModel.$recipientRiskAccepted);

  const path = useUnit(pathModel.$path);
  const resolveName = useUnit(graphModel.$nameResolver);
  const backendContacts = useUnit(contactModel.$backendContacts);

  const deferredCallData = useDeferredValue(callData);
  const chains = useUnit(networkModel.$chains);
  const chainsList = useUnit(networkModel.$chainsList);

  // Drafts restrict the signing-path picker to address-book entries — both
  // initial sources and downstream multisig hops. We lean on graphModel for
  // derivation (proxy-reachability, name resolution) and filter the result to
  // the address-book set; the ownership policy lives here in the consumer
  // rather than in the graph.
  const addressBookIds = useMemo(() => new Set(backendContacts.map((c) => c.accountId)), [backendContacts]);

  const sourcesStore = useMemo(
    () => graphModel.$sourcesFor(selectedChain?.chainId ?? ('0x00' as ChainId)),
    [selectedChain?.chainId],
  );
  const allSources = useUnit(sourcesStore);
  const draftPathSources = useMemo<PathSource[]>(() => {
    if (!selectedChain) return [];

    return allSources.filter((s) => addressBookIds.has(s.accountId));
  }, [allSources, addressBookIds, selectedChain]);

  // Multisig hops past the source must also be address-book entries. Signers
  // (leaf signatories of a multisig) are left unfiltered — they're not picked
  // by name, just by being signatories of a known multisig.
  const filterDraftPathOption = useMemo<(option: PathNextOption) => boolean>(
    () => (option) => option.kind !== 'multisig' || addressBookIds.has(option.accountId),
    [addressBookIds],
  );

  const api = useApi(selectedChain?.chainId ?? ('0x00' as ChainId));
  const specVersion = api?.runtimeVersion.specVersion.toNumber() ?? null;

  const multisigHopAccountId = useMemo(() => deriveMultisigAccountId(path), [path]);

  const decodedCallData = useMemo(
    () => tryDecodeCallData(deferredCallData, api, selectedChain),
    [deferredCallData, api, selectedChain],
  );

  // Backend rejects call data that doesn't decode for the provided chainId (422).
  // Mirror that check client-side so Continue is blocked and the user sees a clear hint.
  const isCallDataUndecodable =
    deferredCallData.length > 0 && isHex(deferredCallData) && !!api && !!selectedChain && !decodedCallData;

  const callDataError = callDataErrorKey
    ? t(callDataErrorKey)
    : isCallDataUndecodable
      ? t('operations.drafts.extrinsicError')
      : null;

  const canAdvanceCallData = activeStep === 'call-data' ? canContinue && !isCallDataUndecodable : canContinue;

  const coreTx = findCoreTransaction(decodedTransaction);
  const txAsset = useTransactionAsset(coreTx, selectedChain?.chainId ?? ('0x00' as ChainId));

  const externalTitle = useTransformer(operationTitleTransformer, {
    operation:
      decodedTransaction && selectedChain ? { transaction: decodedTransaction, chainId: selectedChain.chainId } : null,
    chains,
    asset: txAsset,
    t,
  });

  const operationIcon = useTransformer(operationIconTransformer, {
    operation: { transaction: decodedTransaction },
  });

  const titleData = useMemo(() => {
    if (externalTitle?.title) return externalTitle;
    if (!coreTx) return null;

    const amount = getTransactionAmount(coreTx);
    const asset = txAsset ?? selectedChain?.assets[0] ?? null;

    return {
      title: formatSectionAndMethod(coreTx.section, coreTx.method),
      amount: asset && amount ? { value: amount, asset } : undefined,
    };
  }, [externalTitle, coreTx, txAsset, selectedChain?.chainId]);

  const handleTemplateApply = (templateCallData: string) => {
    createDraftModel.callDataChanged(templateCallData);
    // jump straight to the builder — the user's next step is tweaking the arguments
    createDraftModel.inputModeChanged('build');
  };

  const handleToggle = (open: boolean) => {
    if (open) {
      createDraftModel.createDraftRequested();

      return;
    }

    if (isDirty) {
      setShowDiscardCreate(true);

      return;
    }

    createDraftModel.modalClosed();
  };

  const handleDiscardCreate = () => {
    setShowDiscardCreate(false);
    createDraftModel.modalClosed();
  };

  const handleCreateDraft = async () => {
    if (!backendUrl || !selectedChain || !isRecipientRiskAccepted) return;

    // A lone `signer` is grammatically valid, but a draft along it could never
    // be submitted — the signing path needs at least one delegation hop.
    const validation = isValidPath(path);
    if (!validation.ok || !isUsablePath(path)) {
      toast.error(t('operations.drafts.internalPathError'), {
        description: validation.ok ? undefined : validation.reason,
      });

      return;
    }

    const multisigAccountId = deriveMultisigAccountId(path) ?? undefined;
    const initiatorAccountId = deriveInitiatorAccountId(path) ?? undefined;
    const proxyAccountId = path[0]?.kind === 'proxied' ? path[0].accountId : undefined;

    setIsSubmitting(true);
    try {
      const response = await draftsService.createDraft(backendUrl, {
        chainId: selectedChain.chainId,
        multisigAccountId,
        proxyAccountId,
        signingPath: path,
        initiatorAccountId,
        callData: callData || undefined,
        description: description || undefined,
      });
      draftsResource.draftCreated(response);
      createDraftModel.draftCreated();
      toast.success(t('operations.drafts.createSuccess'));
      createDraftModel.modalClosed();
    } catch (e) {
      let description: string | ReactElement;

      if (e instanceof Error) {
        const match = e.message.match(/^Account (.+) not found$/);
        if (match && selectedChain) {
          const accountId = match[1] as AccountId;
          const address = toAddress(accountId);
          const name = resolveName(accountId, selectedChain.chainId);
          description = (
            <span className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
              <span className="flex items-center gap-1.5">
                <Identicon address={address} size={20} background={false} canCopy />
                <span className="font-medium">{name}</span>
                <span className="text-text-tertiary">{toShortAddress(address)}</span>
              </span>
              <span>{t('operations.drafts.accountNotInAddressBook')}</span>
            </span>
          );
        } else {
          description = e.message;
        }
      } else {
        description = t('operations.drafts.createError');
      }

      toast.error(t('operations.drafts.createError'), { description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const multisigName =
    multisigHopAccountId && selectedChain ? resolveName(multisigHopAccountId as AccountId, selectedChain.chainId) : '';

  return (
    <>
      <Modal size="mdlg" isOpen={isOpen} onToggle={handleToggle}>
        <Modal.Title close>{t('operations.drafts.createNew')}</Modal.Title>
        <StepIndicator step={activeStep} />
        <Modal.Content>
          <div className="flex flex-col px-5 pt-4 pb-5">
            {activeStep === 'call-data' && (
              <StepTransaction
                chains={chainsList}
                selectedChain={selectedChain}
                inputMode={inputMode}
                callData={callData}
                callDataError={callDataError}
                decodedCallData={decodedCallData}
                api={api}
                specVersion={specVersion}
                onChainSelected={createDraftModel.chainSelected}
                onInputModeChanged={(v) => createDraftModel.inputModeChanged(v)}
                onCallDataChanged={createDraftModel.callDataChanged}
                onTemplateApply={handleTemplateApply}
              />
            )}
            {activeStep === 'select-path' && selectedChain && (
              <StepPath
                chainId={selectedChain.chainId}
                sources={draftPathSources}
                filterNextOption={filterDraftPathOption}
              />
            )}
            {activeStep === 'confirm' && selectedChain && (
              <StepReview
                path={path}
                chain={selectedChain}
                callData={callData}
                decodedCallData={decodedCallData as object | null}
                titleData={titleData}
                operationIcon={operationIcon ?? null}
                destinationAccountId={destinationAccountId}
                recipientWarning={recipientWarning}
                recipientCheckPending={!isRecipientCheckable}
                riskAcknowledged={isRiskAcknowledged}
                description={description}
                multisigName={multisigName}
                multisigAccountId={multisigHopAccountId as AccountId | undefined}
                onRiskAcknowledgedChange={createDraftModel.riskAcknowledgedToggled}
                onDescriptionChanged={createDraftModel.descriptionChanged}
              />
            )}
          </div>
        </Modal.Content>

        <Modal.Footer align="between">
          <div>
            {activeStep !== 'call-data' && (
              <Button variant="text" onClick={() => createDraftModel.stepReverted()}>
                {t('operations.drafts.backButton')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeStep === 'call-data' && (
              <Tooltip>
                <Tooltip.Trigger>
                  <div>
                    <Button variant="text" disabled={!canSkip} onClick={() => createDraftModel.skipPressed()}>
                      {t('operations.drafts.skipButton')}
                    </Button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('operations.drafts.skipTooltip')}</Tooltip.Content>
              </Tooltip>
            )}
            <Button
              disabled={!canAdvanceCallData || (activeStep === 'confirm' && !isRecipientRiskAccepted)}
              isLoading={isSubmitting}
              onClick={activeStep === 'confirm' ? handleCreateDraft : () => createDraftModel.stepAdvanced()}
            >
              {activeStep === 'confirm'
                ? t('operations.drafts.createDraftButton')
                : t('operations.callData.continueButton')}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

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
    </>
  );
};
