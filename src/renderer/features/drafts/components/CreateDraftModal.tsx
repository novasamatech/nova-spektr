import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { useDeferredValue, useMemo, useState } from 'react';

import { type CallData, type ChainId, type DecodedTransaction } from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, getNativeAssetId, isHex } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { ConfirmModal, Modal, Tooltip, useNotification } from '@/shared/ui-kit';
import { HttpError, draftsResource, draftsService } from '@/domains/backend';
import { networkModel, useApi } from '@/entities/network';
import { decodeCallData, findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { backendConfigurationModel } from '@/aggregates/backend';
import { operationTitleTransformer } from '@/features/multisig-operations';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { getDestinationAccountId } from '../lib/get-destination-account-id';
import { deriveInitiatorAccountId, deriveMultisigAccountId, isValidPath } from '../lib/path-validation';
import { createDraftModel } from '../model/create-draft-model';
import { graphModel } from '../model/graph-model';
import { pathModel } from '../model/path-model';
import { StepPath } from '../steps/StepPath';
import { StepReview } from '../steps/StepReview';
import { StepTransaction } from '../steps/StepTransaction';

import { StepIndicator } from './signing-path/StepIndicator';

const HTTP_ERROR_KEYS: Record<number, string> = {
  403: 'addressBook.sources.errorForbidden',
  404: 'operations.drafts.multisigNotFound',
  422: 'operations.drafts.validationError',
};

const getSubmitErrorMessage = (e: unknown, t: TFunction): string => {
  const key = e instanceof HttpError ? HTTP_ERROR_KEYS[e.status] : undefined;

  return t(key ?? 'operations.drafts.createError');
};

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

  const path = useUnit(pathModel.$path);
  const nameByAccountId = useUnit(graphModel.$contactNameByAccountId);

  const deferredCallData = useDeferredValue(callData);
  const chains = useUnit(networkModel.$chains);
  const chainsList = useUnit(networkModel.$chainsList);

  const api = useApi(selectedChain?.chainId ?? ('0x00' as ChainId));
  const specVersion = api?.runtimeVersion.specVersion.toNumber() ?? null;

  const multisigHopAccountId = useMemo(() => deriveMultisigAccountId(path), [path]);

  const decodedTransaction = useMemo<DecodedTransaction | null>(() => {
    if (!deferredCallData || !isHex(deferredCallData) || !api || !selectedChain || !multisigHopAccountId) {
      return null;
    }
    try {
      const nativeAssetId = getNativeAssetId(selectedChain.assets);

      return decodeCallData(api, multisigHopAccountId as never, deferredCallData as CallData, nativeAssetId);
    } catch {
      return null;
    }
  }, [deferredCallData, api, selectedChain, multisigHopAccountId]);

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
  const destinationAccountId = useMemo(() => getDestinationAccountId(coreTx), [coreTx]);
  const txAsset = useTransactionAsset(coreTx, selectedChain?.chainId ?? ('0x00' as ChainId));

  const externalTitle = useTransformer(operationTitleTransformer, {
    operation: decodedTransaction
      ? ({ transaction: decodedTransaction, chainId: selectedChain?.chainId } as never)
      : null,
    chains,
    asset: txAsset,
    t,
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
    if (!backendUrl || !selectedChain) return;

    const validation = isValidPath(path);
    if (!validation.ok) {
      toast.error(t('operations.drafts.internalPathError'), { description: validation.reason });

      return;
    }

    const multisigAccountId = deriveMultisigAccountId(path) ?? undefined;
    const initiatorAccountId = deriveInitiatorAccountId(path) ?? undefined;

    setIsSubmitting(true);
    try {
      const response = await draftsService.createDraft(backendUrl, {
        chainId: selectedChain.chainId,
        multisigAccountId,
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
      const errDescription = getSubmitErrorMessage(e, t);
      toast.error(t('operations.drafts.createError'), { description: errDescription });
    } finally {
      setIsSubmitting(false);
    }
  };

  const multisigName = multisigHopAccountId ? (nameByAccountId[multisigHopAccountId] ?? '') : '';

  return (
    <>
      <Modal size="md" isOpen={isOpen} onToggle={handleToggle}>
        <Modal.Title close>{t('operations.drafts.createNew')}</Modal.Title>
        <StepIndicator step={activeStep} />
        <Modal.Content>
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
          {activeStep === 'select-path' && selectedChain && <StepPath chainId={selectedChain.chainId} />}
          {activeStep === 'confirm' && selectedChain && (
            <StepReview
              path={path}
              chain={selectedChain}
              callData={callData}
              decodedCallData={decodedCallData as object | null}
              titleData={titleData}
              destinationAccountId={destinationAccountId}
              description={description}
              multisigName={multisigName}
              multisigAccountId={multisigHopAccountId as AccountId | undefined}
              onDescriptionChanged={createDraftModel.descriptionChanged}
            />
          )}
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
              disabled={!canAdvanceCallData}
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
