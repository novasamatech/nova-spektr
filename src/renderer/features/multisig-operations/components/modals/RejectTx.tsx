import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import {
  type Asset,
  type Chain,
  type FlexibleMultisigAccount,
  type HexString,
  type MultisigAccount,
} from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getAssetByTypeExtras, getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { OperationTitle } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { OperationResult, isXcmTransaction } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { rejectModel } from '../../model/reject-model';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';

import { getMultisigSignOperationTitle } from './getMultisigSignOperationTitle';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  chain: Chain;
  api: ApiPromise;
  children: React.ReactNode;
};

type SubmitData = {
  tx: NonNullable<ReturnType<typeof rejectModel.$transaction.getState>>;
  initiator: NonNullable<ReturnType<typeof rejectModel.$initiator.getState>>;
  txPayload: Uint8Array;
  signature: HexString;
};

const enum Step {
  CONFIRMATION,
  SIGNING,
}

const AllSteps = [Step.CONFIRMATION, Step.SIGNING];

export const RejectTxModal = memo(({ api, operation, account, chain, children }: Props) => {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [submitData, setSubmitData] = useState<SubmitData | null>(null);
  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  useEffect(() => {
    if (isOpen) {
      rejectModel.flow.open({ chain, operation, account });
      return () => {
        rejectModel.flow.close({ chain, operation, account });
      };
    }
  }, [isOpen, chain, operation, account]);

  const wallets = useUnit(walletModel.$wallets);

  const rejectTx = useUnit(rejectModel.$transaction);
  const valid = useUnit(rejectModel.$valid);
  const errors = useUnit(rejectModel.$errors);
  const fee = useUnit(rejectModel.$fee);
  const isFeeLoading = useUnit(rejectModel.$isFeeLoading);
  const multisigDeposit = useUnit(rejectModel.$multisigDeposit);
  const signAccount = useUnit(rejectModel.$signatory);
  const signingPayloads = useUnit(rejectModel.$signingPayloads);
  const initiator = useUnit(rejectModel.$initiator);

  const transaction = operation.transaction;
  const transactionTitle = getMultisigSignOperationTitle(
    isXcmTransaction(transaction),
    t,
    TransactionType.MULTISIG_CANCEL_AS_MULTI,
    operation,
  );

  let asset: Asset | null = getNativeAsset(chain.assets);
  if (chain) {
    const assetId = operationDetailsUtils.getAssetId(operation);
    if (assetId && api) {
      asset = getAssetByTypeExtras(api, chain.assets, assetId);
    }
  }

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSubmitData(null);
      setActiveStep(Step.CONFIRMATION);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitData(null);
    setActiveStep(Step.CONFIRMATION);
  };

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    if (rejectTx && initiator) {
      setSubmitData({
        tx: rejectTx,
        initiator,
        txPayload: payload[0],
        signature: signature[0],
      });
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
        isReject
        tx={submitData.tx}
        api={api}
        operation={operation}
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
        <OperationTitle title={t(transactionTitle || '', { asset: asset?.symbol })} chainId={operation.chainId} />
      </Modal.Title>
      <Modal.Content>
        {activeStep === Step.CONFIRMATION && nonNullable(fee) && (
          <Confirmation
            operation={operation}
            api={api}
            chain={chain}
            fee={fee}
            isFeeLoading={isFeeLoading}
            signAccount={signAccount}
            multisigDeposit={multisigDeposit}
            errors={errors}
            valid={valid}
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
  );
});
