import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { Button, ButtonWebLink, DetailRow, FootnoteText, Icon, LargeTitleText, Loader, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box, Field, Modal, Select } from '@/shared/ui-kit';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import { transactionService } from '@/domains/network';
import { SignButton } from '@/entities/operations';
import { transactionService as entityTransactionService } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { OperationSign, OperationSubmit } from '@/features/operations';
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
        {step === submitDraftModel.Step.CONFIRM && <ConfirmStep />}
        {step === submitDraftModel.Step.SIGN && <OperationSign onGoBack={() => submitDraftModel.flowFinished()} />}
      </Modal.Content>
    </Modal>
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
  const wallets = useUnit(walletModel.$wallets);
  const draft = useUnit(submitDraftModel.$draft);

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

  const showSignatorySelect = signatories.length > 1;

  if (!confirm) {
    if (wrappedTxError) {
      return (
        <Box width="440px" height="200px" verticalAlign="center" horizontalAlign="center" gap={4}>
          <Icon className="text-icon-negative" name="warnCutout" size={60} />
          <FootnoteText className="text-text-tertiary">{t('operations.drafts.extrinsicError')}</FootnoteText>
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

  const { chain, initiator, signatory } = confirm;
  const asset = getNativeAsset(chain.assets);
  const node = chain.nodes.at(0);
  const decodedLink = node && callData ? getPolkadotAppDecodedUrl(node.url, callData) : null;

  const handleSignatoryChange = (accountId: string) => {
    const found = signatories.find((s) => s.accountId === accountId) ?? null;
    submitDraftModel.signatoryChanged(found);
  };

  return (
    <>
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
        <TransactionDetails chain={chain} wallets={wallets} initiators={[initiator]} signatory={signatory}>
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
        </TransactionDetails>
      </Box>

      <Modal.Footer align="between">
        <div />
        <SignButton
          disabled={nullable(wrappedExtrinsic) || nullable(fee)}
          type={confirm.signatoryWallet.type}
          onClick={submitDraftModel.confirmModel.startSigning}
        />
      </Modal.Footer>
    </>
  );
};
