import { type SignerPayloadJSON, type SignerResult } from '@polkadot/types/types';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { memo, useEffect } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, ButtonWebLink, DetailRow, FootnoteText, Icon, LargeTitleText, Separator } from '@/shared/ui';
import { AccountSelect, SignatorySelect, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Field, Modal, ScrollArea } from '@/shared/ui-kit';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import { transactionService } from '@/domains/network';
import { OperationTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { OperationSign } from '@/features/operations';
import { NamedAccount } from '@/widgets/NameResolver';
import { Fee, FeeWithLabel } from '@/widgets/transaction-fee';
import { confirmModel } from '../model/confirm';
import { Step, formModel } from '../model/form';

type Props = {
  payload: SignerPayloadJSON;
  onCancel: (message: string) => void;
  onResult: (signResult: SignerResult) => void;
};

export const SignCustomPayloadModal = memo(({ payload, onCancel, onResult }: Props) => {
  useGate(formModel.flow, { payload });

  const step = useUnit(formModel.$step);
  const signatureResult = useUnit(formModel.$signatureResult);

  useEffect(() => {
    if (signatureResult) {
      const signedExtrinsic = signatureResult.extrinsic.addSignature(
        signatureResult.signatory,
        signatureResult.signature,
        signatureResult.payload,
      );

      onResult({
        id: 0,
        signature: signedExtrinsic.signature.toHex(),
        signedTransaction: signedExtrinsic.toHex(),
      });
    }
  }, [signatureResult]);

  return (
    <Modal size="md" isOpen onToggle={(open) => !open && onCancel('Rejected by user')}>
      <Modal.Title close>
        <OperationTitle title="Sign dapp request on" chainId={payload.genesisHash} />
      </Modal.Title>
      <Modal.Content disableScroll={step === Step.INIT}>
        {step === Step.INIT && <Form onConfirm={() => formModel.form.submit()} />}
        {step === Step.CONFIRM && (
          <Confirmation onBack={() => formModel.setStep(Step.INIT)} onSign={confirmModel.startSigning} />
        )}
        {step === Step.SIGN && <OperationSign onGoBack={() => formModel.setStep(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
});

const Form = memo(({ onConfirm }: { onConfirm: VoidFunction }) => {
  const { t } = useI18n();

  const allAccounts = useUnit(walletModel.$availableAccounts);
  const allWallets = useUnit(walletModel.$allWallets);

  const errors = useUnit(formModel.$errors);
  const canSubmit = useUnit(formModel.$canSubmit);

  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);

  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);

  const showSignatories = useUnit(formModel.$showSignatories);
  const signatories = useUnit(formModel.$signatories);
  const initiators = useUnit(formModel.$initiators);

  const args = useUnit(formModel.$args);

  const {
    fields: { initiator, signatory },
  } = useForm(formModel.form);

  if (nullable(chain)) {
    return null;
  }

  return (
    <>
      <Box padding={[4, 5]} gap={4} shrink={0}>
        <TransactionValidationError errors={errors} wallets={allWallets} />
        <Field text="Account">
          <AccountSelect
            value={initiator.value}
            placeholder="Select initiator"
            options={initiators}
            chain={chain}
            onChange={initiator.onChange}
          />
        </Field>
        {showSignatories && (
          <SignatorySelect
            signatory={signatory.value}
            signatories={signatories}
            hasError={signatory.hasError}
            errorText={signatory.errorMessage}
            network={
              nonNullable(chain) && nonNullable(asset)
                ? {
                    chain,
                    asset,
                  }
                : null
            }
            allAccounts={allAccounts}
            initiator={initiator.value}
            allWallets={allWallets}
            onChange={signatory.onChange}
          />
        )}
        {showSignatories && signatories.length === 1 && nonNullable(signatory.value) && (
          <Field text={t('proxy.addProxy.signatoryLabel')}>
            <NamedAccount accountId={signatory.value.accountId} chain={chain} />
          </Field>
        )}
      </Box>
      {nonNullable(args) && (
        <Box gap={4}>
          <Separator />
          <ScrollArea>
            <Box padding={[4, 5]}>
              <ScrollArea orientation="horizontal">
                <JsonArgs value={args} />
              </ScrollArea>
            </Box>
          </ScrollArea>
        </Box>
      )}
      <Modal.Footer>
        {nonNullable(asset) && (
          <Box direction="row" gap={2} verticalAlign="center">
            <FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>
            <Fee className="text-footnote" fee={fee} isLoading={pendingFee} asset={asset} hideFiat />
          </Box>
        )}
        <Button disabled={!canSubmit} onClick={onConfirm}>
          {t('transfer.continueButton')}
        </Button>
      </Modal.Footer>
    </>
  );
});

const getPolkadotAppDecodedUrl = (node: string, callData: string) => {
  return `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(node)}#/extrinsics/decode/${encodeURIComponent(callData)}`;
};

const Confirmation = memo(({ onBack, onSign }: { onBack: VoidFunction; onSign: VoidFunction }) => {
  const { t } = useI18n();

  const allWallets = useUnit(walletModel.$wallets);
  const confirm = useStoreMap(confirmModel.$confirms, (c) => c.at(0) ?? null);

  if (nullable(confirm)) {
    return null;
  }

  const { chain, initiator, signatory, signatoryWallet, args, transaction, api, fee } = confirm;
  const node = chain.nodes.at(0);
  const asset = getNativeAsset(chain.assets);
  if (nullable(node)) return null;

  let callData: string;
  let operationName: string;
  try {
    const extrinsic = transactionService.createExtrinsic(transaction, api);
    callData = extrinsic.method.toHex();
    operationName = `${extrinsic.method.section}: ${extrinsic.method.method}`;
  } catch {
    const encodedTransaction = transactionService.encodeTransaction(transaction, api);
    callData = encodedTransaction.callData;
    operationName = 'Unknown operation';
  }

  const decodedLink = getPolkadotAppDecodedUrl(node.url, callData);

  return (
    <>
      <Box padding={[4, 5]}>
        <div className="mb-2 flex flex-col items-center gap-y-3 pb-5">
          <Icon name="unknownConfirm" size={60} />
          <LargeTitleText as="p" className="font-manrope">
            {operationName}
          </LargeTitleText>
        </div>

        <TransactionDetails wallets={allWallets} chain={chain} initiators={[initiator]} signatory={signatory}>
          <DetailRow label={t('callData.confirmation.fields.externalExplorer.label')}>
            <ButtonWebLink className="p-0" size="sm" variant="text" href={decodedLink} target="_blank">
              {t('callData.confirmation.fields.externalExplorer.value')}
            </ButtonWebLink>
          </DetailRow>
          <DetailRow label={t('callData.confirmation.fields.details.label')}>
            <Modal size="fit" height="fit">
              <Modal.Trigger>
                <Button className="p-0" size="sm" variant="text">
                  {t('callData.confirmation.fields.details.value')}
                </Button>
              </Modal.Trigger>
              <Modal.Title close>{t('callData.confirmation.fields.details.label')}</Modal.Title>
              <Modal.Content>
                <Box padding={5}>
                  <JsonArgs value={args} />
                </Box>
              </Modal.Content>
            </Modal>
          </DetailRow>
          <Separator className="w-full pr-2" />
          <FeeWithLabel asset={asset} fee={fee} />
        </TransactionDetails>
      </Box>
      <Modal.Footer align="between">
        <Button pallet="secondary" onClick={onBack}>
          {t('operation.goBackButton')}
        </Button>
        <SignButton type={signatoryWallet?.type} onClick={onSign} />
      </Modal.Footer>
    </>
  );
});
