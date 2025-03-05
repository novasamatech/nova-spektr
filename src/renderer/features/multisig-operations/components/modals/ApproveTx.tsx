import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import {
  type Asset,
  type Chain,
  type HexString,
  type MultisigAccount,
  type Timepoint,
  type Transaction,
} from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import {
  TEST_ADDRESS,
  getAssetById,
  getAssetByTypeExtras,
  getNativeAsset,
  nullable,
  toAccountId,
  transferableAmount,
  validateCallData,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/multisig';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { OperationTitle } from '@/entities/chain';
import { multisigUtils } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import {
  MAX_WEIGHT,
  OperationResult,
  getTxFromCallData,
  isXcmTransaction,
  transactionService,
  validateBalance,
} from '@/entities/transaction';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { type SigningPayload } from '@/features/operations/OperationSign';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';

import { SignatorySelectModal } from './SignatorySelectModal';
import { getMultisigSignOperationTitle } from './getMultisigSignOperationTitle';

type Props = {
  tx: MultisigOperation;
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

const ApproveTxModal = memo(({ tx, account, api, chain, children }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);
  const apis = useUnit(networkModel.$apis);

  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [signAccount, setSignAccount] = useState<AnyAccount>();

  const [feeTx, setFeeTx] = useState<Transaction>();
  const [approveTx, setApproveTx] = useState<Transaction>();
  const [txPayload, setTxPayload] = useState<Uint8Array>();

  const [txWeight, setTxWeight] = useState<Weight>();
  const [signature, setSignature] = useState<HexString>();

  const transaction = operationDetailsUtils.getOperationData(tx);
  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(tx), t, feeTx?.type, tx);

  const nativeAsset = getNativeAsset(chain.assets);
  let asset: Asset | null = null;
  if (transaction) {
    if (transaction.args?.assetId) {
      asset = getAssetByTypeExtras(api, chain.assets, transaction.args?.assetId);
    } else {
      asset = getAssetById(transaction.args?.asset, chain.assets) ?? null;
    }
  }

  const availableAccounts = wallets.reduce<AnyAccount[]>((acc, wallet) => {
    if (permissionUtils.canApproveMultisigTx(wallet)) {
      acc.push(...wallet.accounts);
    }

    return acc;
  }, []);

  const unsignedAccounts = operationDetailsUtils.getSignatoryAccounts(
    availableAccounts,
    wallets,
    tx.events,
    account.signatories,
    tx.chainId,
  );

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    setFeeTx(getMultisigTx(toAccountId(TEST_ADDRESS)));

    if (!signAccount?.accountId) return;

    setApproveTx(getMultisigTx(signAccount?.accountId));
  }, [tx, signAccount?.accountId, txWeight]);

  const initWeight = async () => {
    let weight;
    try {
      if (!tx.callData || !api) return;

      const transaction = getTxFromCallData(api, tx.callData);

      weight = await transactionService.getExtrinsicWeight(transaction);
    } catch {
      weight = api.createType('Weight', MAX_WEIGHT);
    }

    setTxWeight(weight as Weight);
  };

  useEffect(() => {
    initWeight();
  }, [tx, api]);

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
    const otherSignatories = multisigUtils.getOtherSignatories(account, signer);
    const hasCallData = tx.callData && validateCallData(tx.callData, tx.callHash);

    return {
      chainId: tx.chainId,
      accountId: signer,
      type: hasCallData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories,
        maxWeight: txWeight,
        maybeTimepoint: {
          height: tx.blockCreated,
          index: tx.indexCreated,
        } as Timepoint,
        callData: tx.callData || undefined,
        callHash: tx.callHash,
      },
    };
  };

  const validateBalanceForFee = async (signAccount: AnyAccount): Promise<boolean> => {
    if (!api || !feeTx || !signAccount.accountId || !nativeAsset) {
      return false;
    }

    const fee = await transactionService.getTransactionFee(feeTx, api);
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
      chainId: tx.chainId,
      transaction: approveTx,
      assetId: nativeAsset.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee: transactionService.getTransactionFee,
    });

  const thresholdReached = tx.events.filter(e => e.status === 'approve').length === account.threshold - 1;

  const readyForSign = tx.status === 'pending' && unsignedAccounts.length > 0;
  const readyForNonFinalSign = readyForSign && !thresholdReached;
  const readyForFinalSign = readyForSign && thresholdReached && !!tx.callData;

  const signingPayloads = useMemo<SigningPayload[]>(() => {
    if (nullable(approveTx) || nullable(signAccount)) return [];
    return [
      {
        chain: chain,
        account: signAccount,
        transaction: approveTx,
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
        multisigTx={tx}
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
        <OperationTitle title={t(transactionTitle || '', { asset: asset?.symbol })} chainId={tx.chainId} />
      </Modal.Title>
      <Modal.Content>
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            tx={tx}
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
            apis={apis}
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
