import { type Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type MultisigTransactionDS } from '@/shared/api/storage';
import {
  type Account,
  type Address,
  type HexString,
  type MultisigAccount,
  type Timepoint,
  type Transaction,
} from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { TEST_ADDRESS, getAssetById, toAddress, transferableAmount, validateCallData } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { OperationTitle } from '@/entities/chain';
import { useMultisigEvent } from '@/entities/multisig';
import { type ExtendedChain, networkModel } from '@/entities/network';
import { priceProviderModel } from '@/entities/price';
import {
  MAX_WEIGHT,
  OperationResult,
  getMultisigSignOperationTitle,
  isXcmTransaction,
  transactionService,
  useCallDataDecoder,
  validateBalance,
} from '@/entities/transaction';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { getSignatoryAccounts } from '../../common/utils';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';

import { SignatorySelectModal } from './SignatorySelectModal';

type Props = {
  tx: MultisigTransactionDS;
  account: MultisigAccount;
  connection: ExtendedChain;
  children: React.ReactNode;
};

const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.CONFIRMATION, Step.SIGNING, Step.SUBMIT];

const ApproveTxModal = ({ tx, account, connection, children }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);
  const apis = useUnit(networkModel.$apis);

  const { getTxFromCallData } = useCallDataDecoder();
  const { getLiveTxEvents } = useMultisigEvent({});
  const events = getLiveTxEvents(tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated);

  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [signAccount, setSignAccount] = useState<Account>();

  const [feeTx, setFeeTx] = useState<Transaction>();
  const [approveTx, setApproveTx] = useState<Transaction>();
  const [txPayload, setTxPayload] = useState<Uint8Array>();

  const [txWeight, setTxWeight] = useState<Weight>();
  const [signature, setSignature] = useState<HexString>();

  const transactionTitle = getMultisigSignOperationTitle(isXcmTransaction(tx.transaction), t, feeTx?.type, tx);

  const nativeAsset = connection.assets[0];
  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets);

  const availableAccounts = wallets.reduce<Account[]>((acc, wallet) => {
    if (permissionUtils.canApproveMultisigTx(wallet)) {
      acc.push(...wallet.accounts);
    }

    return acc;
  }, []);

  const unsignedAccounts = getSignatoryAccounts(availableAccounts, wallets, events, account.signatories, tx.chainId);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    setFeeTx(getMultisigTx(TEST_ADDRESS));

    if (!signAccount?.accountId) return;

    setApproveTx(getMultisigTx(signAccount?.accountId));
  }, [tx, signAccount?.accountId, txWeight]);

  const initWeight = async () => {
    let weight;
    try {
      if (!tx.callData || !connection.api) return;

      const transaction = getTxFromCallData(connection.api, tx.callData);

      weight = await transactionService.getExtrinsicWeight(transaction);
    } catch {
      if (tx.transaction?.args && connection.api) {
        weight = await transactionService.getTxWeight(tx.transaction as Transaction, connection.api);
      } else {
        weight = connection.api?.createType('Weight', MAX_WEIGHT);
      }
    }

    setTxWeight(weight as Weight);
  };

  useEffect(() => {
    initWeight();
  }, [tx.transaction, connection.api]);

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

  const getMultisigTx = (signer: Address): Transaction => {
    const signerAddress = toAddress(signer, { prefix: connection?.addressPrefix });

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      const signatoryAddress = toAddress(s.accountId, { prefix: connection?.addressPrefix });

      if (signerAddress !== signatoryAddress) {
        acc.push(signatoryAddress);
      }

      return acc;
    }, []);

    const hasCallData = tx.callData && validateCallData(tx.callData, tx.callHash);

    return {
      chainId: tx.chainId,
      address: signerAddress,
      type: hasCallData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
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

  const validateBalanceForFee = async (signAccount: Account): Promise<boolean> => {
    if (!connection.api || !feeTx || !signAccount.accountId || !nativeAsset) {
      return false;
    }

    const fee = await transactionService.getTransactionFee(feeTx, connection.api);
    const balance = balanceUtils.getBalance(
      balances,
      signAccount.accountId,
      connection.chainId,
      nativeAsset.assetId.toString(),
    );

    if (!balance) {
      return false;
    }

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  };

  const selectSignerAccount = async (account: Account) => {
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
      api: connection.api,
      chainId: tx.chainId,
      transaction: approveTx,
      assetId: nativeAsset.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee: transactionService.getTransactionFee,
    });

  const thresholdReached = events.filter((e) => e.status === 'SIGNED').length === account.threshold - 1;

  const readyForSign = tx.status === 'SIGNING' && unsignedAccounts.length > 0;
  const readyForNonFinalSign = readyForSign && !thresholdReached;
  const readyForFinalSign = readyForSign && thresholdReached && !!tx.callData;

  if (!readyForFinalSign && !readyForNonFinalSign) {
    return null;
  }

  const isSubmitStep = activeStep === Step.SUBMIT && approveTx && signAccount && signature && txPayload;
  if (isSubmitStep && connection.api) {
    return (
      <Submit
        tx={approveTx}
        api={connection.api}
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
        <OperationTitle title={t(transactionTitle, { asset: asset?.symbol })} chainId={tx.chainId} />
      </Modal.Title>
      <Modal.Content>
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            tx={tx}
            account={account}
            chainConnection={connection}
            feeTx={feeTx}
            signAccount={unsignedAccounts.length === 1 ? unsignedAccounts[0] : undefined}
            onSign={trySetSignerAccount}
          />
        )}

        {activeStep === Step.SIGNING && approveTx && connection.api && signAccount && (
          <SigningSwitch
            signerWallet={wallets.find((w) => w.id === signAccount.walletId)}
            apis={apis}
            signingPayloads={[
              {
                chain: connection,
                account: signAccount,
                transaction: approveTx,
                signatory: signAccount,
              },
            ]}
            validateBalance={checkBalance}
            onGoBack={goBack}
            onResult={onSignResult}
          />
        )}

        <SignatorySelectModal
          isOpen={isSelectAccountModalOpen}
          accounts={unsignedAccounts}
          chain={connection}
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
};

export default ApproveTxModal;
