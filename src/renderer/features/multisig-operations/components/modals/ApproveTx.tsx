import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

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

type SubmitData = {
  tx: NonNullable<ReturnType<typeof approveModel.$transaction.getState>>;
  initiator: NonNullable<ReturnType<typeof approveModel.$initiator.getState>>;
  txPayload: Uint8Array;
  signature: HexString;
};

const enum Step {
  FORM,
  CONFIRMATION,
  SIGNING,
}

const AllSteps = [Step.FORM, Step.CONFIRMATION, Step.SIGNING];

export const ApproveTxModal = memo(({ operation, account, api, chain, children }: Props) => {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [submitData, setSubmitData] = useState<SubmitData | null>(null);
  const [activeStep, setActiveStep] = useState(Step.FORM);
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  // Control gate based on modal open state
  useEffect(() => {
    if (isOpen) {
      approveModel.flow.open({ chain, operation, account });
      return () => {
        approveModel.flow.close({ chain, operation, account });
      };
    }
  }, [isOpen, chain, operation, account]);

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

  const transaction = operation.transaction;
  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(transaction), t, approveTx?.type, operation);

  const nativeAsset = getNativeAsset(chain.assets);
  const asset = useTransactionAsset(transaction, operation.chainId);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSubmitData(null);
      setActiveStep(Step.FORM);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitData(null);
    setActiveStep(Step.FORM);
  };

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    if (approveTx && initiator) {
      setSubmitData({
        tx: approveTx,
        initiator,
        txPayload: payload[0],
        signature: signature[0],
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
        account={submitData.initiator}
        txPayload={submitData.txPayload}
        signature={submitData.signature}
        onClose={handleClose}
      />
    );
  }

  return (
    <Modal size="md" onToggle={handleToggle}>
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
