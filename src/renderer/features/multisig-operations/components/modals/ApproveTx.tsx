import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { type Chain, type HexString, type MultisigAccount, type Timepoint, type Transaction } from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import {
  TEST_ADDRESS,
  getNativeAsset,
  nullable,
  toAccountId,
  transferableAmount,
  validateCallData,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import {
  type AnyAccount,
  type MultisigOperation,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { OperationTitle } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import {
  MAX_WEIGHT,
  OperationResult,
  getExtrinsic,
  isXcmTransaction,
  transactionService as oldTransactionService,
  useTransactionAsset,
  validateBalance,
} from '@/entities/transaction';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { type ExtrinsicSigningPayload } from '@/features/operations/OperationSign';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';

import { SignatorySelectModal } from './SignatorySelectModal';
import { getMultisigSignOperationTitle } from './getMultisigSignOperationTitle';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount;
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
  const balances = useUnit(balanceModel.$balances);

  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [signAccount, setSignAccount] = useState<AnyAccount>();

  const [feeTx, setFeeTx] = useState<Transaction>();
  const [approveTx, setApproveTx] = useState<Transaction>();
  const [txPayload, setTxPayload] = useState<Uint8Array>();

  const [txWeight, setTxWeight] = useState<Weight>();
  const [signature, setSignature] = useState<HexString>();

  const transaction = operation.transaction;
  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(transaction), t, feeTx?.type, operation);

  const nativeAsset = getNativeAsset(chain.assets);
  const asset = useTransactionAsset(operation);

  const availableAccounts = wallets.reduce<AnyAccount[]>((acc, wallet) => {
    if (permissionUtils.canApproveMultisigTx(wallet)) {
      acc.push(...wallet.accounts);
    }

    return acc;
  }, []);

  const unsignedAccounts = operationDetailsUtils.getSignatoryAccounts(
    availableAccounts,
    wallets,
    operation.events,
    account.signatories,
    operation.chainId,
  );

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    setFeeTx(getMultisigTx(toAccountId(TEST_ADDRESS)));

    if (!signAccount?.accountId) return;

    setApproveTx(getMultisigTx(signAccount?.accountId));
  }, [operation, signAccount?.accountId, txWeight]);

  const initWeight = async () => {
    let weight;
    try {
      const transaction = operation.transaction;
      if (!transaction || !transaction.type || !api) return;

      const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

      weight = await transactionService.getExtrinsicWeight(extrinsic);
    } catch {
      weight = api.createType('Weight', MAX_WEIGHT);
    }

    setTxWeight(weight as Weight);
  };

  useEffect(() => {
    initWeight();
  }, [operation, api]);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    setSignature(signature[0]);
    setTxPayload(payload[0]);
    setActiveStep(Step.SUBMIT);
  };

  const handleClose = () => {
    setActiveStep(Step.CONFIRMATION);
  };

  const getMultisigTx = (signer: AccountId): Transaction => {
    const otherSignatories = multisigOperationService.getOtherSignatories(account, signer);
    const hasCallData = operation.callData && validateCallData(operation.callData, operation.callHash);

    return {
      chainId: operation.chainId,
      accountId: signer,
      type: hasCallData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories,
        maxWeight: txWeight,
        maybeTimepoint: {
          height: operation.blockCreated,
          index: operation.indexCreated,
        } satisfies Timepoint,
        callData: operation.callData,
        callHash: operation.callHash,
      },
    };
  };

  const validateBalanceForFee = async (signAccount: AnyAccount): Promise<boolean> => {
    if (!api || !feeTx || !signAccount.accountId || !nativeAsset) {
      return false;
    }

    const fee = await oldTransactionService.getTransactionFee(feeTx, api);
    const balance = balanceUtils.getBalance(
      balances,
      signAccount.accountId,
      chain.chainId,
      nativeAsset.assetId.toString(),
    );

    if (!balance) {
      return false;
    }

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  };

  const selectSignerAccount = async (account: AnyAccount) => {
    setSignAccount(account);
    toggleSelectAccountModal();

    const isValid = await validateBalanceForFee(account);

    if (isValid) {
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  const trySetSignerAccount = () => {
    if (unsignedAccounts.length === 1) {
      setSignAccount(unsignedAccounts[0]);
      setActiveStep(Step.SIGNING);
    } else {
      toggleSelectAccountModal();
    }
  };

  const checkBalance = () =>
    validateBalance({
      api,
      chainId: operation.chainId,
      transaction: approveTx,
      assetId: nativeAsset.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee: oldTransactionService.getTransactionFee,
    });

  const thresholdReached = operation.events.filter(e => e.status === 'approve').length === account.threshold - 1;

  const readyForSign = operation.status === 'pending' && unsignedAccounts.length > 0;
  const readyForNonFinalSign = readyForSign && !thresholdReached;
  const readyForFinalSign = readyForSign && thresholdReached && !!operation.transaction;

  const signingPayloads = useMemo<ExtrinsicSigningPayload[]>(() => {
    if (nullable(approveTx) || nullable(signAccount)) return [];
    return [
      {
        api,
        chain,
        extrinsic: getExtrinsic[approveTx.type](approveTx.args, api),
        signatory: signAccount,
      },
    ];
  }, [chain, signAccount, approveTx]);

  if (!readyForFinalSign && !readyForNonFinalSign) {
    return null;
  }

  const isSubmitStep = activeStep === Step.SUBMIT && approveTx && signAccount && signature && txPayload;
  if (isSubmitStep && api) {
    return (
      <Submit
        tx={approveTx}
        api={api}
        operation={operation}
        account={signAccount}
        txPayload={txPayload}
        signature={signature}
        onClose={handleClose}
      />
    );
  }

  return (
    <Modal size="md" onToggle={handleClose}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t(transactionTitle || '', { asset: asset?.symbol })} chainId={operation.chainId} />
      </Modal.Title>
      <Modal.Content>
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            operation={operation}
            account={account}
            api={api}
            chain={chain}
            feeTx={feeTx}
            signAccount={unsignedAccounts.length === 1 ? unsignedAccounts[0] : undefined}
            onSign={trySetSignerAccount}
          />
        )}

        {activeStep === Step.SIGNING && approveTx && api && signAccount && (
          <SigningSwitch
            signerWallet={wallets.find(w => w.id === signAccount.walletId)}
            signingPayloads={signingPayloads}
            validateBalance={checkBalance}
            onGoBack={goBack}
            onResult={onSignResult}
          />
        )}

        <SignatorySelectModal
          isOpen={isSelectAccountModalOpen}
          accounts={unsignedAccounts}
          chain={chain}
          nativeAsset={nativeAsset}
          onClose={toggleSelectAccountModal}
          onSelect={selectSignerAccount}
        />

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

export default ApproveTxModal;
