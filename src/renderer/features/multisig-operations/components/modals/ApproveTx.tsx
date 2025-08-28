import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { type Chain, type FlexibleMultisigAccount, type HexString, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigOperation, accounts } from '@/domains/network';
import { OperationTitle } from '@/entities/chain';
import { priceProviderModel } from '@/entities/price';
import { OperationResult, isXcmTransaction, useTransactionAsset } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { approveModel } from '../../model/approve-model';
import { operationsContextModel } from '../../model/context';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';

import { SignatorySelectModal } from './SignatorySelectModal';
import { getMultisigSignOperationTitle } from './getMultisigSignOperationTitle';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  chain: Chain;
  api: ApiPromise;
  children: React.ReactNode;
};

const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.CONFIRMATION, Step.SIGNING, Step.SUBMIT];

const ApproveTxModal = memo(({ operation, account, api, chain, children }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const accountsList = useUnit(accounts.$list);
  const multisigAccount = useUnit(operationsContextModel.$multisigAccount);

  const approveTx = useUnit(approveModel.$transaction);
  const errors = useUnit(approveModel.$errors);
  const signAccount = useUnit(approveModel.$signatory);
  const initiator = useUnit(approveModel.$initiator);
  const fee = useUnit(approveModel.$fee);
  const isFeeLoading = useUnit(approveModel.$isFeeLoading);
  const isDepositLoading = useUnit(approveModel.$isDepositLoading);
  const multisigDeposit = useUnit(approveModel.$multisigDeposit);
  const signingPayloads = useUnit(approveModel.$signingPayloads);

  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [signature, setSignature] = useState<HexString>();

  const transaction = operation.transaction;
  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(transaction), t, approveTx?.type, operation);

  const nativeAsset = getNativeAsset(chain.assets);
  const asset = useTransactionAsset(operation);

  const unsignedAccounts = useMemo(() => {
    if (!multisigAccount || !chain) return [];

    const signatories = accountsList.filter(a =>
      multisigAccount.signatories.some(s => s.accountId === a.accountId && (s.id ? s.id === a.walletId : true)),
    );

    return signatories.filter(a => !operation.events.some(e => e.accountId === a.accountId));
  }, [operation, multisigAccount, chain, accountsList]);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    setSignature(signature[0]);
    setTxPayload(payload[0]);
    setActiveStep(Step.SUBMIT);
  };

  const setSignerAccount = () => {
    if (unsignedAccounts.length === 1) {
      approveModel.selectInitiator(unsignedAccounts[0]);
    } else {
      toggleSelectAccountModal();
    }
  };

  const selectSignerAccount = (account: AnyAccount) => {
    approveModel.selectInitiator(account);
    toggleSelectAccountModal();
  };

  const toggleModal = (open: boolean) => {
    if (open) {
      approveModel.flow.open({ chain, operation });
      setSignerAccount();
    } else {
      approveModel.flow.close({ chain: null, operation: null });
      setActiveStep(Step.CONFIRMATION);
    }
  };

  // wtf do we need it?
  const handleConfirm = () => {
    if (errors.length === 0) {
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
        account={initiator}
        txPayload={txPayload}
        signature={signature}
        onClose={() => toggleModal(false)}
      />
    );
  }

  return (
    <>
      <Modal size="md" onToggle={toggleModal}>
        <Modal.Trigger>{children}</Modal.Trigger>
        <Modal.Title close>
          <OperationTitle title={t(transactionTitle || '', { asset: asset?.symbol })} chainId={operation.chainId} />
        </Modal.Title>
        <Modal.Content>
          {activeStep === Step.CONFIRMATION && (
            <Confirmation
              operation={operation}
              api={api}
              chain={chain}
              fee={fee}
              isFeeLoading={isFeeLoading}
              isDepositLoading={isDepositLoading}
              signAccount={signAccount}
              multisigDeposit={multisigDeposit}
              errors={errors}
              onSign={handleConfirm}
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
      <SignatorySelectModal
        isOpen={isSelectAccountModalOpen}
        accounts={unsignedAccounts}
        chain={chain}
        nativeAsset={nativeAsset}
        onClose={toggleSelectAccountModal}
        onSelect={selectSignerAccount}
      />
    </>
  );
});

export default ApproveTxModal;
