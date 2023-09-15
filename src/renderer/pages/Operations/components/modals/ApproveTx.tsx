import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';

import { BaseModal, Button, Icon } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { AccountDS, MultisigTransactionDS } from '@renderer/shared/api/storage';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Account, MultisigAccount, useAccount } from '@renderer/entities/account';
import { ExtendedChain } from '@renderer/entities/network';
import { Address, HexString, SigningType, Timepoint } from '@renderer/domain/shared-kernel';
import { TEST_ADDRESS, toAddress, transferableAmount, getAssetById } from '@renderer/shared/lib/utils';
import { getModalTransactionTitle } from '../../common/utils';
import { useBalance } from '@renderer/entities/asset';
import { Submit } from '../ActionSteps/Submit';
import { Confirmation } from '../ActionSteps/Confirmation';
import { SignatorySelectModal } from './SignatorySelectModal';
import { useMultisigEvent } from '@renderer/entities/multisig';
import { Signing } from '@renderer/features/operation';
import { OperationTitle } from '@renderer/components/common';
import {
  OperationResult,
  Transaction,
  TransactionType,
  useCallDataDecoder,
  useTransaction,
  validateBalance,
  isXcmTransaction,
} from '@renderer/entities/transaction';

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
  const { getBalance } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee, getExtrinsicWeight } = useTransaction();
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

  const accounts = getLiveAccounts();
  const transactionTitle = getModalTransactionTitle(isXcmTransaction(tx.transaction), tx.transaction);

  const nativeAsset = connection.assets[0];
  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets);

  const unsignedAccounts = accounts.filter((a) => {
    const isSignatory = account.signatories.find((s) => s.accountId === a.accountId);
    const isSigned = events.some((e) => e.accountId === a.accountId);
    const isCurrentChain = !a.chainId || a.chainId === tx.chainId;
    const isWatchOnly = a.signingType === SigningType.WATCH_ONLY;

    return isSignatory && !isSigned && isCurrentChain && !isWatchOnly;
  });

  useEffect(() => {
    setFeeTx(getMultisigTx(TEST_ADDRESS));

    if (!signAccount?.accountId) return;

    setApproveTx(getMultisigTx(signAccount?.accountId));
  }, [tx, signAccount?.accountId, txWeight]);

  useEffect(() => {
    if (!tx.callData || !connection.api) return;

    const transaction = getTxFromCallData(connection.api, tx.callData);

    getExtrinsicWeight(transaction).then(setTxWeight);
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
      address: signer,
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

  const validateBalanceForFee = async (signAccount: AccountDS): Promise<boolean> => {
    if (!connection.api || !feeTx || !signAccount.accountId || !nativeAsset) return false;

    const fee = await getTransactionFee(feeTx, connection.api);
    const balance = await getBalance(signAccount.accountId, connection.chainId, nativeAsset.assetId.toString());

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
      getBalance,
      getTransactionFee,
    });

  const thresholdReached = events.filter((e) => e.status === 'SIGNED').length === account.threshold - 1;

  const readyForSign = tx.status === 'SIGNING' && unsignedAccounts.length > 0;
  const readyForNonFinalSign = readyForSign && !thresholdReached;
  const readyForFinalSign = readyForSign && thresholdReached && !!tx.callData;

  if (!readyForFinalSign && !readyForNonFinalSign) return null;

  const isSubmitStep = activeStep === Step.SUBMIT && approveTx && signAccount && signature && unsignedTx;

  return (
    <>
      <Button size="sm" className="ml-auto" onClick={() => setIsModalOpen(true)}>
        {t('operation.approveButton')}
      </Button>

      <BaseModal
        closeButton
        isOpen={activeStep !== Step.SUBMIT && isModalOpen}
        title={<OperationTitle title={t(transactionTitle, { asset: asset?.symbol })} chainId={tx.chainId} />}
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-[440px]"
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <>
            <Confirmation tx={tx} account={account} connection={connection} feeTx={feeTx} />
            <Button
              className="mt-7 ml-auto"
              prefixElement={<Icon name="vault" size={14} />}
              onClick={trySetSignerAccount}
            >
              {t('operation.signButton')}
            </Button>
          </>
        )}

        {activeStep === Step.SIGNING && approveTx && connection.api && signAccount && (
          <Signing
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
          <Button onClick={toggleFeeModal}>{t('operation.feeErrorButton')}</Button>
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
