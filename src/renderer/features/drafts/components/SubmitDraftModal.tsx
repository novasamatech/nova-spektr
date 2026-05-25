import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { getNativeAsset, nullable, toAddress } from '@/shared/lib/utils';
import {
  Alert,
  Button,
  ButtonWebLink,
  DetailRow,
  FootnoteText,
  Icon,
  InputHint,
  LargeTitleText,
  Loader,
  Separator,
  SmallTitleText,
} from '@/shared/ui';
import { Account, Address, TransactionValidationError, WalletIcon } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import { transactionService, useAccountName } from '@/domains/network';
import { SignButton } from '@/entities/operations';
import { transactionService as entityTransactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { EmptyAccountMessage } from '@/features/emptyList';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { PathBreadcrumb, PathReviewPopover } from '@/features/signing-path';
import { WalletDetails } from '@/features/wallet-details';
import { FeeWithLabel } from '@/widgets/transaction-fee';
import { submitDraftModel } from '../model/submit-draft-model';

type Props = {
  onClose: () => void;
};

const getPolkadotAppDecodedUrl = (node: string, callData: string) => {
  return `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(node)}#/extrinsics/decode/${encodeURIComponent(callData)}`;
};

export const SubmitDraftModal = ({ onClose }: Props) => {
  const { t } = useI18n();
  const step = useUnit(submitDraftModel.$step);

  const isOpen = step !== submitDraftModel.Step.NONE;

  const [isModalOpen, closeModal] = useModalClose(isOpen, () => {
    submitDraftModel.flowFinished();
    onClose();
  });

  if (step === submitDraftModel.Step.SUBMIT) {
    return (
      <OperationSubmit
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={() => {
          closeModal();
        }}
      />
    );
  }

  return (
    <Modal isOpen={isModalOpen} size="md" height="fit" onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>{t('operations.drafts.submitTitle')}</Modal.Title>
      <Modal.Content>
        {step === submitDraftModel.Step.CALL_DATA && <CallDataStep />}
        {step === submitDraftModel.Step.CONFIRM && <ConfirmStep />}
        {step === submitDraftModel.Step.SIGN && <OperationSign onGoBack={() => submitDraftModel.flowFinished()} />}
      </Modal.Content>
    </Modal>
  );
};

const CallDataStep = () => {
  const { t } = useI18n();

  const callData = useUnit(submitDraftModel.$pendingCallData);
  const decoded = useUnit(submitDraftModel.$pendingCallDataDecoded);
  const hasError = useUnit(submitDraftModel.$pendingCallDataError);
  const canConfirm = useUnit(submitDraftModel.$canConfirmCallData);
  const saving = useUnit(submitDraftModel.$savingCallData);

  return (
    <>
      <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
        <Field text={t('operations.drafts.callDataLabel')}>
          <Input
            height="md"
            placeholder={t('operations.drafts.callDataPlaceholder')}
            value={callData}
            invalid={hasError}
            onChange={submitDraftModel.callDataChanged}
          />
          <InputHint variant="error" active={hasError}>
            {t('operations.drafts.extrinsicError')}
          </InputHint>
        </Field>

        {decoded && (
          <div className="flex flex-col gap-y-2">
            <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
            <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4 break-all">
              <Json value={decoded} name="call" />
            </div>
          </div>
        )}
      </div>

      <Modal.Footer align="between">
        <div />
        <Button disabled={!canConfirm} isLoading={saving} onClick={() => submitDraftModel.callDataConfirmRequested()}>
          {t('operations.callData.continueButton')}
        </Button>
      </Modal.Footer>
    </>
  );
};

const ConfirmStep = () => {
  const { t } = useI18n();

  const confirms = useUnit(submitDraftModel.confirmModel.$confirms);
  const signatories = useUnit(submitDraftModel.$signatories);
  const selectedSignatory = useUnit(submitDraftModel.$signatoryStore);
  const fee = useUnit(submitDraftModel.$fee);
  const wrappedExtrinsic = useUnit(submitDraftModel.$wrappedExtrinsic);
  const wrappedTxError = useUnit(submitDraftModel.$wrappedTxError);
  const wrappedTxErrorKind = useUnit(submitDraftModel.$wrappedTxErrorKind);
  const wallets = useUnit(walletModel.$wallets);
  const draft = useUnit(submitDraftModel.$draft);
  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const initiatorUnavailable = useUnit(submitDraftModel.$initiatorUnavailable);
  const validationErrors = useUnit(submitDraftModel.$validationErrors);
  const validationValid = useUnit(submitDraftModel.$validationValid);
  const validationPending = useUnit(submitDraftModel.$validationPending);

  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Defer surfacing wrappedTx errors so a transient `true` during store init
  // (chain set before accounts settle, etc.) doesn't flash the red error UI
  // before the confirm view replaces it.
  const [showWrappedTxError, setShowWrappedTxError] = useState(false);
  useEffect(() => {
    if (!wrappedTxError) {
      setShowWrappedTxError(false);
      return;
    }
    const timer = setTimeout(() => setShowWrappedTxError(true), 300);
    return () => clearTimeout(timer);
  }, [wrappedTxError]);

  const confirm = confirms.at(0) ?? null;

  const wrappedArgs = useMemo(() => {
    if (!wrappedExtrinsic || !confirm?.chain) return null;

    try {
      return entityTransactionService.formatCall(wrappedExtrinsic.method, confirm.chain);
    } catch {
      return null;
    }
  }, [wrappedExtrinsic, confirm?.chain]);

  const callData = useMemo(() => {
    if (!confirm) return null;

    try {
      const extrinsic = transactionService.createExtrinsic(confirm.transaction, confirm.api);

      return extrinsic.method.toHex();
    } catch {
      try {
        const encoded = transactionService.encodeTransaction(confirm.transaction, confirm.api);

        return encoded.callData;
      } catch {
        return draft?.callData ?? null;
      }
    }
  }, [confirm, draft]);

  const signatoryOptions = useMemo(() => {
    return signatories.map((s) => {
      const wallet = walletUtils.getWalletById(wallets, s.walletId);

      return {
        account: s,
        walletName: wallet?.name ?? s.accountId,
      };
    });
  }, [signatories, wallets]);

  const initiatorWallet = useMemo(() => {
    if (!draft || !wallets.length) return null;

    if (draft.proxyAccountId) {
      return walletUtils.getWalletFilteredAccounts(wallets, {
        walletFn: (w) => walletUtils.isFlexibleMultisig(w),
        accountFn: (a) =>
          accountUtils.isFlexibleMultisigAccount(a) &&
          a.accountId === draft.proxyAccountId &&
          a.multisigAccountId === draft.multisigAccountId,
      });
    }

    return walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => walletUtils.isAnyMultisig(w),
      accountFn: (a) => a.accountId === draft.multisigAccountId,
    });
  }, [draft, wallets]);

  const showSignatorySelect = signatories.length > 1;
  const noSignatories = signatories.length === 0;
  const canAddAccount = walletUtils.isPolkadotVault(activeWallet);

  // For proxy drafts, show the proxy address with its contact name.
  // For regular multisig drafts, show the multisig account from the wallet.
  const isProxyDraft = !!draft?.proxyAccountId;
  const multisigAccountId = confirm?.initiator.accountId ?? null;
  const multisigChain = confirm?.chain ?? null;
  const multisigName = useAccountName({ accountId: isProxyDraft ? null : multisigAccountId, chain: multisigChain });

  if (noSignatories) {
    return (
      <>
        <Box width="440px" verticalAlign="center" horizontalAlign="center" gap={4} padding={[10, 5]}>
          <Icon className="text-icon-warning" name="warnCutout" size={60} />
          <Alert active title={t('emptyState.accountDescription')} variant="warn">
            <EmptyAccountMessage walletType={activeWallet?.type} />
          </Alert>
        </Box>

        {canAddAccount && (
          <Modal.Footer>
            <Button className="ml-auto" onClick={() => setShowWalletDetails(true)}>
              {t('emptyState.addAccountButton')}
            </Button>
          </Modal.Footer>
        )}

        <WalletDetails
          isOpen={showWalletDetails}
          wallet={activeWallet ?? null}
          onClose={() => setShowWalletDetails(false)}
        />
      </>
    );
  }

  if (!confirm) {
    if (showWrappedTxError) {
      const messageKey =
        wrappedTxErrorKind === 'signing-path-unresolved'
          ? 'operations.drafts.signingPathUnresolved'
          : 'operations.drafts.extrinsicError';

      return (
        <Box width="440px" height="200px" verticalAlign="center" horizontalAlign="center" gap={4}>
          <Icon className="text-icon-negative" name="warnCutout" size={60} />
          <FootnoteText className="text-text-tertiary">{t(messageKey)}</FootnoteText>
        </Box>
      );
    }

    return (
      <Box width="440px" height="200px" verticalAlign="center" horizontalAlign="center" gap={4}>
        <Loader color="primary" />
        <FootnoteText className="text-text-tertiary">{t('signing.loadingSignData')}</FootnoteText>
      </Box>
    );
  }

  const { chain, initiator } = confirm;
  const asset = getNativeAsset(chain.assets);
  const node = chain.nodes.at(0);
  const decodedLink = node && callData ? getPolkadotAppDecodedUrl(node.url, callData) : null;

  const handleSignatoryChange = (accountId: string) => {
    const found = signatories.find((s) => s.accountId === accountId) ?? null;
    submitDraftModel.signatoryChanged(found);
  };

  const signingPath = draft?.signingPath ?? [];

  return (
    <>
      {signingPath.length > 0 && draft && (
        <div className="mx-5 mt-4 flex flex-col gap-y-3">
          {signingPath.length >= 2 && (
            <div className="flex justify-start">
              <PathReviewPopover path={signingPath} chainId={draft.chainId as ChainId} />
            </div>
          )}
          <PathBreadcrumb path={signingPath} chainId={draft.chainId as ChainId} size="sm" orientation="auto" />
        </div>
      )}

      {initiatorUnavailable && (
        <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-icon-warning/20 bg-icon-warning/8 px-3 py-2">
          <Icon className="mt-0.5 shrink-0 text-icon-warning" name="warnCutout" size={16} />
          <FootnoteText className="text-text-secondary">{t('operations.drafts.initiatorUnavailable')}</FootnoteText>
        </div>
      )}

      <div className="mb-2 flex flex-col items-center gap-y-3 px-5 py-4">
        <Icon className="text-icon-default" name="unknownConfirm" size={60} />
        <LargeTitleText className="font-manrope">{t('operations.drafts.submitTitle')}</LargeTitleText>
      </div>

      {showSignatorySelect && (
        <div className="mx-5 mb-2">
          <Field text={t('operations.drafts.submitSignatory')}>
            <Select
              height="md"
              placeholder={t('operations.drafts.submitSignatory')}
              value={selectedSignatory?.accountId ?? null}
              onChange={handleSignatoryChange}
            >
              {signatoryOptions.map(({ account, walletName }) => (
                <Select.Item key={account.accountId} value={account.accountId}>
                  <span className="flex w-full items-center gap-x-2">
                    <span className="truncate">{walletName}</span>
                  </span>
                </Select.Item>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Box padding={[4, 5]}>
        <dl className="flex w-full flex-col gap-y-4 text-footnote">
          {initiatorWallet && (
            <DetailRow label={t('transaction.details.wallet')}>
              <div className="flex items-center gap-x-2">
                <WalletIcon type={initiatorWallet.type} size={16} />
                <FootnoteText>{initiatorWallet.name}</FootnoteText>
              </div>
            </DetailRow>
          )}
          <DetailRow label={t('transaction.details.account')}>
            {draft?.proxyAccountId ? (
              <div className="flex w-max max-w-full min-w-0 items-center gap-2">
                <Address
                  showIcon
                  variant="short"
                  address={toAddress(draft.proxyAccountId, { prefix: chain.addressPrefix })}
                  title={draft.proxyContact?.name}
                />
              </div>
            ) : (
              <Account variant="short" accountId={initiator.accountId} chain={chain} title={multisigName} />
            )}
          </DetailRow>
          <Separator className="border-filter-border" />
          <DetailRow label={t('transaction.details.sinatoryWallet')}>
            <div className="flex items-center gap-x-2">
              <WalletIcon type={confirm.signatoryWallet.type} size={16} />
              <FootnoteText>{confirm.signatoryWallet.name}</FootnoteText>
            </div>
          </DetailRow>
          {selectedSignatory && (
            <DetailRow label={t('transaction.details.sinatoryAccount')}>
              <Account variant="short" accountId={selectedSignatory.accountId} chain={chain} />
            </DetailRow>
          )}
          <Separator className="border-filter-border" />
          {draft?.description && (
            <DetailRow label={t('operations.drafts.descriptionLabel')}>
              <FootnoteText className="text-text-primary">{draft.description}</FootnoteText>
            </DetailRow>
          )}
          {decodedLink && (
            <DetailRow label={t('callData.confirmation.fields.externalExplorer.label')}>
              <ButtonWebLink className="p-0" size="sm" variant="text" href={decodedLink} target="_blank">
                {t('callData.confirmation.fields.externalExplorer.value')}
              </ButtonWebLink>
            </DetailRow>
          )}
          {wrappedArgs && (
            <DetailRow label={t('callData.confirmation.fields.details.label')}>
              <Modal size="lg" height="fit">
                <Modal.Trigger>
                  <Button className="p-0" size="sm" variant="text">
                    {t('callData.confirmation.fields.details.value')}
                  </Button>
                </Modal.Trigger>
                <Modal.Title close>{t('callData.confirmation.fields.details.label')}</Modal.Title>
                <Modal.Content>
                  <Box padding={5}>
                    <JsonArgs value={wrappedArgs} />
                  </Box>
                </Modal.Content>
              </Modal>
            </DetailRow>
          )}
          <Separator className="w-full pr-2" />
          <FeeWithLabel asset={asset} fee={fee} />
        </dl>
      </Box>

      {validationErrors.length > 0 && (
        <div className="mx-5 mb-3">
          <TransactionValidationError errors={validationErrors} wallets={wallets} />
        </div>
      )}

      <Modal.Footer align="between">
        <div />
        <SignButton
          disabled={
            initiatorUnavailable || nullable(wrappedExtrinsic) || nullable(fee) || validationPending || !validationValid
          }
          isDefault={initiatorUnavailable}
          type={confirm.signatoryWallet.type}
          onClick={submitDraftModel.confirmModel.startSigning}
        />
      </Modal.Footer>
    </>
  );
};
