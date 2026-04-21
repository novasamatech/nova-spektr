import { isHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { type CallData, type ChainId, type DecodedTransaction, WalletType } from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatSectionAndMethod, getNativeAssetId, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, FootnoteText, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { ChainSelect, Hash, WalletAccountIcon } from '@/shared/ui-entities';
import { ConfirmModal, Field, Input, Modal, Select, Tabs, TextArea, Tooltip, useNotification } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { HttpError, draftsResource, draftsService } from '@/domains/backend';
import { accounts, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, useApi } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { decodeCallData, findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { backendConfigurationModel } from '@/aggregates/backend';
import { ExtrinsicBuilder } from '@/features/extrinsic-builder';
import { operationTitleTransformer } from '@/features/multisig-operations';
import { OperationTemplatesToolbar } from '@/features/operation-templates';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { getDestinationAccountId } from '../lib/get-destination-account-id';
import { type DraftAccountOption, STEPS_ORDER, createDraftModel } from '../model/create-draft-model';

import { DraftSummary } from './DraftSummary';

export const CreateDraftModal = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const backendUrl = useUnit(backendConfigurationModel.$backendUrl);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardCreate, setShowDiscardCreate] = useState(false);

  const isModalOpen = useUnit(createDraftModel.$isOpen);
  const activeStep = useUnit(createDraftModel.$activeStep);
  const selectedAccount = useUnit(createDraftModel.$selectedAccount);
  const selectedMultisigForProxy = useUnit(createDraftModel.$selectedMultisigForProxy);
  const selectedChain = useUnit(createDraftModel.$selectedChain);
  const callData = useUnit(createDraftModel.$callData);
  const description = useUnit(createDraftModel.$description);
  const inputMode = useUnit(createDraftModel.$inputMode);
  const effectiveChain = useUnit(createDraftModel.$effectiveChain);
  const isProxySelected = useUnit(createDraftModel.$isProxySelected);
  const callDataErrorKey = useUnit(createDraftModel.$callDataErrorKey);
  const isCreateDirty = useUnit(createDraftModel.$isDirty);
  const canContinue = useUnit(createDraftModel.$canContinue);
  const canSkip = useUnit(createDraftModel.$canSkip);

  const deferredCallData = useDeferredValue(callData);

  const allAccounts = useUnit(accounts.$list);
  const allMultisigAccounts = useMemo(() => allAccounts.filter(accountUtils.isAnyMultisigAccount), [allAccounts]);
  const allWallets = useUnit(walletModel.$wallets);
  const multisigWallets = useMemo(() => allWallets.filter(walletUtils.isAnyMultisig), [allWallets]);
  const chains = useUnit(networkModel.$chains);
  const chainsList = useUnit(networkModel.$chainsList);
  const backendContacts = useUnit(contactModel.$backendContacts);
  const proxies = useUnit(proxyModel.$proxies);

  const resolvedWallets = useWalletsNames(multisigWallets);

  const draftAccountOptions = useMemo<DraftAccountOption[]>(() => {
    const activeChainId = effectiveChain?.chainId;

    const multisigAccountIds = new Set(
      backendContacts.filter((c) => c.signatories?.length && c.threshold).map((c) => toAccountId(c.accountId)),
    );

    // For a contact, proxyModel.$proxies[contactId] lists accounts that can sign ON BEHALF OF this contact.
    // A contact is worth showing if at least one such signer is a multisig we have in the address book
    // (and is relevant on the active chain).
    const getSignerMultisigIds = (contactAccountId: AccountId) => {
      const signers = proxies[contactAccountId] ?? [];

      return signers
        .filter((p) => !activeChainId || p.chainId === activeChainId)
        .map((p) => p.accountId)
        .filter((id) => multisigAccountIds.has(id));
    };

    return backendContacts
      .filter((c) => {
        const isMultisig = !!c.signatories?.length && !!c.threshold;
        if (isMultisig) return true;

        return getSignerMultisigIds(toAccountId(c.accountId)).length > 0;
      })
      .filter((c) => {
        if (!activeChainId) return true;
        const contactChainId = c.chainId as ChainId | null;

        return !contactChainId || contactChainId === activeChainId;
      })
      .map((c) => {
        const localAccount = allMultisigAccounts.find((a) => a.accountId === c.accountId);
        const wallet = localAccount ? resolvedWallets.find((w) => w.id === localAccount.walletId) : null;
        const contactChainId = c.chainId as ChainId | null;
        const addressPrefix = contactChainId ? chains[contactChainId]?.addressPrefix : undefined;

        const isMultisig = !!c.signatories?.length && !!c.threshold;
        const signerMultisigIds = getSignerMultisigIds(toAccountId(c.accountId));

        return {
          accountId: toAccountId(c.accountId),
          name: wallet?.name ?? c.name,
          chainId: contactChainId ?? undefined,
          signatories: c.signatories?.map((s) => toAccountId(s)),
          threshold: c.threshold ?? undefined,
          walletType: wallet?.type ?? null,
          address: toAddress(c.accountId, { prefix: addressPrefix }),
          isProxy: !isMultisig && signerMultisigIds.length > 0,
          signerMultisigIds: signerMultisigIds.length > 0 ? signerMultisigIds : undefined,
        };
      });
  }, [backendContacts, allMultisigAccounts, resolvedWallets, chains, effectiveChain, proxies]);

  const multisigOptionsForProxy = useMemo(() => {
    if (!selectedAccount?.signerMultisigIds?.length) return [];

    const signerSet = new Set(selectedAccount.signerMultisigIds);

    return draftAccountOptions.filter((o) => o.signatories?.length && o.threshold && signerSet.has(o.accountId));
  }, [draftAccountOptions, selectedAccount]);

  const draftMultisig = isProxySelected ? selectedMultisigForProxy : selectedAccount;
  const draftProxy = isProxySelected ? selectedAccount : null;
  const isFlex = isProxySelected && selectedAccount?.walletType === WalletType.FLEXIBLE_MULTISIG;

  const api = useApi(effectiveChain?.chainId ?? ('0x00' as ChainId));
  const specVersion = api?.runtimeVersion.specVersion.toNumber() ?? null;

  const decodedTransaction = useMemo<DecodedTransaction | null>(() => {
    if (!deferredCallData || !isHex(deferredCallData) || !api || !effectiveChain || !selectedAccount) {
      return null;
    }

    try {
      const nativeAssetId = getNativeAssetId(effectiveChain.assets);

      return decodeCallData(api, selectedAccount.accountId, deferredCallData as CallData, nativeAssetId);
    } catch {
      return null;
    }
  }, [deferredCallData, api, effectiveChain, selectedAccount]);

  const decodedCallData = useMemo(
    () => tryDecodeCallData(deferredCallData, api, effectiveChain),
    [deferredCallData, api, effectiveChain],
  );

  // Backend rejects call data that doesn't decode for the provided chainId (422).
  // Mirror that check client-side so Continue is blocked and the user sees a clear hint.
  const isCallDataUndecodable =
    deferredCallData.length > 0 && isHex(deferredCallData) && !!api && !!effectiveChain && !decodedCallData;

  const callDataError = callDataErrorKey
    ? t(callDataErrorKey)
    : isCallDataUndecodable
      ? t('operations.drafts.extrinsicError')
      : null;

  const canAdvanceCallData = activeStep === 'call-data' ? canContinue && !isCallDataUndecodable : canContinue;

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

  const handleTemplateApply = (templateCallData: string) => {
    createDraftModel.callDataChanged(templateCallData);
  };

  const handleAccountChange = (accountId: string) => {
    const found = draftAccountOptions.find((o) => o.accountId === accountId) ?? null;
    createDraftModel.accountSelected(found);

    if (found?.isProxy && found.signerMultisigIds?.length) {
      const signerSet = new Set(found.signerMultisigIds);
      const matchingMultisigs = draftAccountOptions.filter(
        (o) => o.signatories?.length && o.threshold && signerSet.has(o.accountId),
      );
      if (matchingMultisigs.length === 1) {
        createDraftModel.proxyMultisigSelected(matchingMultisigs[0] ?? null);
      }
    }
  };

  const handleToggle = (open: boolean) => {
    if (open) {
      createDraftModel.createDraftRequested();

      return;
    }

    if (isCreateDirty) {
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
    if (!backendUrl || !selectedAccount || !effectiveChain) return;

    setIsSubmitting(true);
    try {
      const response = await draftsService.createDraft(backendUrl, {
        chainId: effectiveChain.chainId,
        multisigAccountId: (draftMultisig ?? selectedAccount).accountId,
        proxyAccountId: draftProxy?.accountId,
        callData: callData || undefined,
        description: description || undefined,
      });
      draftsResource.draftCreated(response);
      createDraftModel.draftCreated();
      toast.success(t('operations.drafts.createSuccess'));
      createDraftModel.modalClosed();
    } catch (e) {
      const errorDescription =
        e instanceof HttpError && e.status === 403
          ? t('addressBook.sources.errorForbidden')
          : e instanceof HttpError && e.status === 422
            ? t('operations.drafts.descriptionRequired')
            : t('operations.drafts.createError');
      toast.error(t('operations.drafts.createError'), { description: errorDescription });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal size="md" isOpen={isModalOpen} onToggle={handleToggle}>
        <Modal.Title close>{t('operations.drafts.createNew')}</Modal.Title>
        <div className="flex items-center justify-center gap-2">
          {(
            [
              { key: 'call-data', label: t('operations.drafts.stepCallData') },
              { key: 'select-multisig', label: t('operations.drafts.stepMultisig') },
              { key: 'confirm', label: t('operations.drafts.stepConfirm') },
            ] as const
          ).map(({ key, label }, i) => {
            const activeIndex = STEPS_ORDER.indexOf(activeStep);
            const isCompleted = activeIndex > i;
            const isCurrent = activeIndex === i;

            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cnTw(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                      isCompleted && 'bg-icon-positive text-white',
                      isCurrent && 'bg-icon-accent text-white',
                      !isCompleted && !isCurrent && 'bg-input-background-disabled text-text-tertiary',
                    )}
                  >
                    {isCompleted ? '\u2713' : i + 1}
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
                {i < STEPS_ORDER.length - 1 && (
                  <div className={cnTw('mb-5 h-0.5 w-8', isCompleted ? 'bg-icon-positive' : 'bg-divider')} />
                )}
              </div>
            );
          })}
        </div>
        <Modal.Content>
          {activeStep === 'call-data' && (
            <div className="flex min-h-[500px] flex-col gap-4 p-4">
              <Field text={t('operations.drafts.selectNetwork')}>
                <ChainSelect
                  placeholder={t('operations.drafts.selectNetwork')}
                  value={selectedChain ?? effectiveChain}
                  options={chainsList}
                  onChange={createDraftModel.chainSelected}
                />
              </Field>

              {effectiveChain && (
                <>
                  <Tabs
                    value={inputMode}
                    onChange={(value) => createDraftModel.inputModeChanged(value as 'paste' | 'build')}
                  >
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
                          onChange={createDraftModel.callDataChanged}
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
                          if (inputMode === 'build') createDraftModel.callDataChanged(hex ?? '');
                        }}
                      />
                    </Tabs.Content>
                  </Tabs>

                  {callDataError && inputMode === 'build' && (
                    <InputHint variant="error" active>
                      {callDataError}
                    </InputHint>
                  )}

                  <OperationTemplatesToolbar
                    api={api}
                    chainId={effectiveChain.chainId}
                    callData={callData}
                    specVersion={specVersion}
                    onApply={handleTemplateApply}
                  />

                  {decodedCallData && (
                    <div className="flex flex-col gap-y-2">
                      <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
                      <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4 break-all">
                        <Json value={decodedCallData} name="call" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeStep === 'select-multisig' && (
            <div className="flex flex-col gap-4 p-4">
              {draftAccountOptions.length === 0 ? (
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
                    {draftAccountOptions.map((opt) => (
                      <Select.Item key={opt.accountId} value={opt.accountId}>
                        <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
                          <WalletAccountIcon
                            address={opt.address}
                            type={opt.walletType ?? ('Multisig' as WalletType)}
                            size={24}
                            iconSize={12}
                          />
                          <span className="flex w-full flex-col overflow-hidden">
                            <span className="w-fit max-w-full truncate">{opt.name}</span>
                            <span className="w-full text-help-text text-text-tertiary">
                              <Hash value={opt.address} variant="truncate" />
                            </span>
                          </span>
                        </span>
                      </Select.Item>
                    ))}
                  </Select>
                </Field>
              )}

              {isProxySelected && (
                <Field text={t('operations.drafts.selectMultisigForProxy')}>
                  <Select
                    height="md"
                    placeholder={t('operations.drafts.selectMultisigForProxy')}
                    value={selectedMultisigForProxy?.accountId ?? null}
                    onChange={(accountId: string) => {
                      const found = multisigOptionsForProxy.find((o) => o.accountId === accountId) ?? null;
                      createDraftModel.proxyMultisigSelected(found);
                    }}
                  >
                    {multisigOptionsForProxy.map((opt) => (
                      <Select.Item key={opt.accountId} value={opt.accountId}>
                        <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
                          <WalletAccountIcon
                            address={opt.address}
                            type={opt.walletType ?? ('Multisig' as WalletType)}
                            size={24}
                            iconSize={12}
                          />
                          <span className="flex w-full flex-col overflow-hidden">
                            <span className="w-fit max-w-full truncate">{opt.name}</span>
                            <span className="w-full text-help-text text-text-tertiary">
                              <Hash value={opt.address} variant="truncate" />
                            </span>
                          </span>
                        </span>
                      </Select.Item>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}

          {activeStep === 'confirm' && (
            <div className="flex flex-col gap-4 p-4">
              <Field
                text={
                  <>
                    {t('operations.drafts.descriptionLabel')} <span className="text-text-negative">*</span>
                  </>
                }
              >
                <TextArea
                  placeholder={t('operations.drafts.descriptionPlaceholder')}
                  value={description}
                  rows={3}
                  onChange={createDraftModel.descriptionChanged}
                />
              </Field>

              <DraftSummary
                multisigName={
                  isFlex ? (selectedAccount?.name ?? '') : (draftMultisig?.name ?? selectedAccount?.name ?? '')
                }
                multisigAccountId={
                  isFlex ? selectedAccount?.accountId : (draftMultisig?.accountId ?? selectedAccount?.accountId)
                }
                walletType={
                  isFlex
                    ? (selectedAccount?.walletType ?? undefined)
                    : (draftMultisig?.walletType ?? selectedAccount?.walletType ?? undefined)
                }
                proxyName={isFlex ? undefined : draftProxy?.name}
                proxyAccountId={isFlex ? undefined : draftProxy?.accountId}
                threshold={
                  draftMultisig?.threshold && draftMultisig?.signatories
                    ? t('createMultisigAccount.thresholdOutOf', {
                        threshold: draftMultisig.threshold,
                        signatoriesLength: draftMultisig.signatories.length,
                      })
                    : undefined
                }
                chain={effectiveChain}
                titleData={titleData}
                destinationAccountId={destinationAccountId}
                callData={callData || undefined}
                jsonArgs={decodedCallData}
              />

              {!callData && (
                <FootnoteText className="text-center text-text-tertiary">
                  {t('operations.drafts.summaryNoCallData')}
                </FootnoteText>
              )}
            </div>
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
