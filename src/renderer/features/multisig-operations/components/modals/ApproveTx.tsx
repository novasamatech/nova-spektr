import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { type ReactNode, memo, useState } from 'react';

import {
  type Chain,
  type FlexibleMultisigAccount,
  type HexString,
  type MultisigAccount,
  type Transaction,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { ConfirmModal, Modal } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
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
  children: ReactNode;
};

type SubmitData = {
  tx: Transaction;
  initiator: AnyAccount;
  txPayload: Uint8Array;
  signature: HexString;
  description: string;
};

const enum Step {
  FORM,
  CONFIRMATION,
  SIGNING,
}

const AllSteps = [Step.FORM, Step.CONFIRMATION, Step.SIGNING];

export const ApproveTxModal = memo(({ operation, account, api, chain, children }: Props) => {
  const { t } = useI18n();

  const [submitData, setSubmitData] = useState<SubmitData | null>(null);
  const [activeStep, setActiveStep] = useState(Step.FORM);
  const [isFeeModalOpen, toggleFeeModal] = useToggle();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
  const description = useUnit(approveModel.$description);

  const transaction = operation.transaction;
  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(transaction), t, approveTx?.type, operation);

  const nativeAsset = getNativeAsset(chain.assets);
  const asset = useTransactionAsset(transaction, operation.chainId);

  const handleToggle = (open: boolean) => {
    if (open) {
      approveModel.flow.open({ chain, operation, account });
      setIsModalOpen(true);
    } else if (activeStep === Step.SIGNING) {
      setShowConfirm(true);
    } else {
      approveModel.flow.close({ chain, operation, account });
      setSubmitData(null);
      setActiveStep(Step.FORM);
      setIsModalOpen(false);
    }
  };

  const handleClose = () => {
    approveModel.flow.close({ chain, operation, account });
    setSubmitData(null);
    setActiveStep(Step.FORM);
    setIsModalOpen(false);
    setShowConfirm(false);
  };

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    if (approveTx && initiator) {
      setSubmitData({
        tx: approveTx,
        initiator,
        txPayload: payload[0]!,
        signature: signature[0]!,
        description,
      });
    }
  };

  const onFormSubmit = () => {
    if (valid) {
      setActiveStep(Step.CONFIRMATION);
    }
  };

  const handleConfirm = () => {
    if (valid) {
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  if (submitData && api) {
    return (
      <Submit
        tx={submitData.tx}
        api={api}
        operation={operation}
        txPayload={submitData.txPayload}
        signature={submitData.signature}
        description={submitData.description}
        onClose={handleClose}
      />
    );
  }

  return (
    <>
      <Modal size="md" isOpen={isModalOpen} onToggle={handleToggle}>
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
          {activeStep === Step.CONFIRMATION && (
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
      <ConfirmModal
        isOpen={showConfirm}
        title={t('operation.submitCloseConfirmTitle')}
        description={t('operation.submitCloseConfirmDescription')}
        cancelText={t('operation.submitCloseConfirmLeave')}
        confirmText={t('operation.submitCloseConfirmStay')}
        onCancel={handleClose}
        onConfirm={() => setShowConfirm(false)}
      />
    </>
  );
});
