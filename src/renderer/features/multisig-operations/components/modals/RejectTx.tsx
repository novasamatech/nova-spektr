import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

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
import { getAssetByTypeExtras, getNativeAsset, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { OperationTitle } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import { OperationResult, getExtrinsic, isXcmTransaction } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { type ExtrinsicSigningPayload } from '@/features/operations/OperationSign';
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

const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.CONFIRMATION, Step.SIGNING, Step.SUBMIT];

const RejectTxModal = memo(({ api, operation, chain, children }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const rejectTx = useUnit(rejectModel.$transaction);
  const isEnoughBalance = useUnit(rejectModel.$isEnoughBalance);
  const fee = useUnit(rejectModel.$fee);
  const isFeeLoading = useUnit(rejectModel.$isFeeLoading);
  const isDepositLoading = useUnit(rejectModel.$isDepositLoading);
  const multisigDeposit = useUnit(rejectModel.$multisigDeposit);
  const signAccount = useUnit(rejectModel.$signatory);
  const initiator = useUnit(rejectModel.$initiator);

  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [signature, setSignature] = useState<HexString>();

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

  const signingPayloads = useMemo<ExtrinsicSigningPayload[]>(() => {
    if (nullable(rejectTx) || nullable(signAccount)) return [];
    return [
      {
        api,
        chain: chain,
        extrinsic: getExtrinsic[rejectTx.type](rejectTx.args, api),
        signatory: signAccount,
      },
    ];
  }, [chain, signAccount, rejectTx]);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    setTxPayload(payload[0]);
    setSignature(signature[0]);
    setActiveStep(Step.SUBMIT);
  };

  const toggleModal = (open: boolean) => {
    if (open) {
      rejectModel.flow.open({ chain, signer: signAccount, operation });
    } else {
      rejectModel.flow.close({ chain: null, signer: null, operation: null });
      setActiveStep(Step.CONFIRMATION);
    }
  };

  const handleConfirm = () => {
    if (isEnoughBalance) {
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  const isSubmitStep = activeStep === Step.SUBMIT && rejectTx && initiator && signature && txPayload;

  if (isSubmitStep && api) {
    return (
      <Submit
        isReject
        tx={rejectTx}
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
            isEnoughBalance={isEnoughBalance}
            onSign={handleConfirm}
          />
        )}
        {activeStep === Step.SIGNING && rejectTx && api && signAccount && (
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

export default RejectTxModal;
