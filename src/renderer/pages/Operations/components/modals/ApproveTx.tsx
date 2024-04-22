import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigTransactionDS } from '@shared/api/storage';
import { useToggle } from '@shared/lib/hooks';
import { ExtendedChain } from '@entities/network';
import { TEST_ADDRESS, toAddress, transferableAmount, getAssetById } from '@shared/lib/utils';
import { getMultisigSignOperationTitle, getSignatoryAccounts } from '../../common/utils';
import { Submit } from '../ActionSteps/Submit';
import { Confirmation } from '../ActionSteps/Confirmation';
import { SignatorySelectModal } from './SignatorySelectModal';
import { useMultisigEvent } from '@entities/multisig';
import { SigningSwitch } from '@features/operations';
import { permissionUtils, walletModel } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import type { Address, HexString, Timepoint, MultisigAccount, BaseAccount, Account } from '@shared/core';
import { balanceModel, balanceUtils } from '@entities/balance';
import { OperationTitle } from '@entities/chain';
import {
  isXcmTransaction,
  MAX_WEIGHT,
  OperationResult,
  Transaction,
  TransactionType,
  useCallDataDecoder,
  useTransaction,
  validateBalance,
  transactionService,
} from '@entities/transaction';

type Props = {
  tx: MultisigTransactionDS;
  account: MultisigAccount;
  connection: ExtendedChain;
};

const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.CONFIRMATION, Step.SIGNING, Step.SUBMIT];

const ApproveTx = ({ tx, account, connection }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);

  const { getExtrinsicWeight, getTxWeight } = useTransaction();
  const { getTxFromCallData } = useCallDataDecoder();
  const { getLiveTxEvents } = useMultisigEvent({});
  const events = getLiveTxEvents(tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [signAccount, setSignAccount] = useState<Account>();

  const [feeTx, setFeeTx] = useState<Transaction>();
  const [approveTx, setApproveTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

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

      weight = await getExtrinsicWeight(transaction);
    } catch (e) {
      if (tx.transaction?.args && connection.api) {
        weight = await getTxWeight(tx.transaction as Transaction, connection.api);
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

  const onSignResult = (signature: HexString[], unsigned: UnsignedTransaction[]) => {
    setSignature(signature[0]);
    setUnsignedTx(unsigned[0]);
    setIsModalOpen(false);
    setActiveStep(Step.SUBMIT);
  };

  const handleClose = () => {
    setIsModalOpen(false);
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

    return {
      chainId: tx.chainId,
      address: signerAddress,
      type: tx.callData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        maxWeight: txWeight,
        maybeTimepoint: {
          height: tx.blockCreated,
          index: tx.indexCreated,
        } as Timepoint,
        callData: tx.callData,
        callHash: tx.callHash,
      },
    };
  };

  const validateBalanceForFee = async (signAccount: Account): Promise<boolean> => {
    if (!connection.api || !feeTx || !signAccount.accountId || !nativeAsset) return false;

    const fee = await transactionService.getTransactionFee(feeTx, connection.api);
    const balance = balanceUtils.getBalance(
      balances,
      signAccount.accountId,
      connection.chainId,
      nativeAsset.assetId.toString(),
    );

    if (!balance) return false;

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

  if (!readyForFinalSign && !readyForNonFinalSign) return null;

  const isSubmitStep = activeStep === Step.SUBMIT && approveTx && signAccount && signature && unsignedTx;

  return (
    <>
      <Button className="ml-auto" onClick={() => setIsModalOpen(true)}>
        {t('operation.approveButton')}
      </Button>

      <BaseModal
        closeButton
        isOpen={activeStep !== Step.SUBMIT && isModalOpen}
        title={<OperationTitle title={t(transactionTitle, { asset: asset?.symbol })} chainId={tx.chainId} />}
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        headerClass="py-3 pl-5 pr-3"
        panelClass="w-[440px]"
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            tx={tx}
            account={account}
            connection={connection}
            feeTx={feeTx}
            signatory={unsignedAccounts.length === 1 ? unsignedAccounts[0] : undefined}
            onSign={trySetSignerAccount}
          />
        )}

        {activeStep === Step.SIGNING && approveTx && connection.api && signAccount && (
          <SigningSwitch
            chainId={tx.chainId}
            api={connection.api}
            addressPrefix={connection?.addressPrefix}
            accounts={[signAccount]}
            transactions={[approveTx]}
            signatory={signAccount}
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
      </BaseModal>

      {isSubmitStep && connection.api && (
        <Submit
          tx={approveTx}
          api={connection.api}
          multisigTx={tx}
          matrixRoomId={account.matrixRoomId}
          account={signAccount}
          unsignedTx={unsignedTx}
          signature={signature}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default ApproveTx;
