import { type ApiPromise } from '@polkadot/api';
import { useGate, useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { type Chain, type FlexibleMultisigAccount, type HexString, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { OperationTitle } from '@/entities/chain';
import { OperationResult, isXcmTransaction, useTransactionAsset } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { approveModel } from '../../model/approve-model';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';
import { ApproveForm } from '../ApproveForm';

import { getMultisigSignOperationTitle } from './getMultisigSignOperationTitle';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  chain: Chain;
  api: ApiPromise;
  children: React.ReactNode;
};

const enum Step {
  FORM,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.FORM, Step.CONFIRMATION, Step.SIGNING, Step.SUBMIT];

export const ApproveTxModal = memo(({ operation, account, api, chain, children }: Props) => {
  useGate(approveModel.flow, { chain, operation, account });

  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const multisigAccount = useUnit(approveModel.$multisigAccount);

  const approveTx = useUnit(approveModel.$transaction);
  const valid = useUnit(approveModel.$valid);
  const signAccount = useUnit(approveModel.$signatory);
  const initiator = useUnit(approveModel.$initiator);
  const fee = useUnit(approveModel.$fee);
  const isFeeLoading = useUnit(approveModel.$isFeeLoading);

  const isDepositRequired = useUnit(approveModel.$isDepositRequired);
  const multisigDeposit = useUnit(approveModel.$multisigDeposit);
  const signingPayloads = useUnit(approveModel.$signingPayloads);
  const unsignedAccounts = useUnit(approveModel.$unsignedAccounts);

  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.FORM);
  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [signature, setSignature] = useState<HexString>();

  const transaction = operation.transaction;
  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(transaction), t, approveTx?.type, operation);

  const nativeAsset = getNativeAsset(chain.assets);
  const asset = useTransactionAsset(transaction, operation.chainId);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    setSignature(signature[0]);
    setTxPayload(payload[0]);
    setActiveStep(Step.SUBMIT);
  };

  const onFormSubmit = () => {
    if (valid) {
      setActiveStep(Step.CONFIRMATION);
    }
  };

  const toggleModal = (open: boolean) => {
    if (!open) {
      setActiveStep(Step.FORM);
    }
  };

  // wtf do we need it?
  const handleConfirm = () => {
    if (valid) {
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  const thresholdReached = operation.events.filter(e => e.status === 'approve').length === account.threshold - 1;

  const readyForSign = operation.status === 'pending' && unsignedAccounts.length > 0;
  const readyForNonFinalSign = readyForSign && !thresholdReached;
  const readyForFinalSign = readyForSign && thresholdReached && !!operation.transaction;

  if (!readyForFinalSign && !readyForNonFinalSign) {
    return null;
  }

  const isSubmitStep = activeStep === Step.SUBMIT && approveTx && initiator && signature && txPayload;
  if (isSubmitStep && api) {
    return (
      <Submit
        tx={approveTx}
        api={api}
        operation={operation}
        txPayload={txPayload}
        signature={signature}
        onClose={() => toggleModal(false)}
      />
    );
  }

  return (
    <Modal size="md" onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle
          title={activeStep !== Step.FORM ? t(transactionTitle || '', { asset: asset?.symbol }) : ''}
          chainId={operation.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {activeStep === Step.FORM && multisigAccount && (
          <ApproveForm
            unsignedAccounts={unsignedAccounts}
            chain={chain}
            nativeAsset={nativeAsset}
            operation={operation}
            onSubmit={onFormSubmit}
          />
        )}
        {activeStep === Step.CONFIRMATION && fee && (
          <Confirmation
            operation={operation}
            api={api}
            chain={chain}
            fee={fee}
            isFeeLoading={isFeeLoading}
            isDepositRequired={isDepositRequired}
            signAccount={signAccount}
            multisigDeposit={multisigDeposit}
            valid={valid}
            onSign={handleConfirm}
            onGoBack={() => setActiveStep(Step.FORM)}
          />
        )}

        {activeStep === Step.SIGNING && signingPayloads && signAccount && (
          <SigningSwitch
            signerWallet={wallets.find(w => w.id === signAccount.walletId)}
            signingPayloads={signingPayloads}
            onGoBack={goBack}
            onResult={onSignResult}
          />
        )}

        <OperationResult
          isOpen={isFeeModalOpen}
          variant="error"
          title={t('operation.feeErrorTitle')}
          description={t('operation.feeErrorMessage')}
          onClose={toggleFeeModal}
        >
          <Button onClick={toggleFeeModal}>{t('operation.submitErrorButton')}</Button>
        </OperationResult>
      </Modal.Content>
    </Modal>
  );
});
