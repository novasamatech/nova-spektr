import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';

import { Icon, BaseModal, Button } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { AccountDS, MultisigTransactionDS } from '@renderer/shared/api/storage';
import { useCountdown, useToggle } from '@renderer/shared/lib/hooks';
import { Account, MultisigAccount, useAccount } from '@renderer/entities/account';
import { ExtendedChain } from '@renderer/entities/network';
import {
  Transaction,
  TransactionType,
  isDecodedTx,
  useTransaction,
  OperationResult,
} from '@renderer/entities/transaction';
import { Address, HexString, SigningType, Timepoint } from '@renderer/domain/shared-kernel';
import { toAddress, transferableAmount, TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { getTransactionTitle } from '../../common/utils';
import { Submit } from '../ActionSteps/Submit';
import { useBalance } from '@renderer/entities/asset';
import Confirmation from '@renderer/pages/Operations/components/ActionSteps/Confirmation';
import SignatorySelectModal from '@renderer/pages/Operations/components/modals/SignatorySelectModal';
import OperationModalTitle from '@renderer/pages/Operations/components/OperationModalTitle';
import { Signing } from '@renderer/pages/Transfer/components/ActionSteps';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { useMultisigEvent } from '@renderer/entities/multisig';

type Props = {
  tx: MultisigTransactionDS;
  account: MultisigAccount;
  connection: ExtendedChain;
};

const enum Step {
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.CONFIRMATION, Step.SCANNING, Step.SIGNING, Step.SUBMIT];

const ApproveTx = ({ tx, account, connection }: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee, getTxWeight } = useTransaction();
  const { getLiveTxEvents } = useMultisigEvent({});
  const events = getLiveTxEvents(tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [countdown, resetCountdown] = useCountdown(connection.api);
  const [signAccount, setSignAccount] = useState<Account>();

  const [feeTx, setFeeTx] = useState<Transaction>();
  const [approveTx, setApproveTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [txPayload, setTxPayload] = useState<Uint8Array>();

  const [txWeight, setTxWeight] = useState<Weight>();
  const [signature, setSignature] = useState<HexString>();

  const accounts = getLiveAccounts();
  const transactionTitle = getTransactionTitle(tx.transaction);

  const unsignedAccounts = accounts.filter((a) => {
    const isSignatory = account.signatories.find((s) => s.accountId === a.accountId);
    const notSigned = !events.find((e) => e.accountId === a.accountId);
    const isCurrentChain = !a.chainId || a.chainId === tx.chainId;
    const notWatchOnly = account.signingType !== SigningType.WATCH_ONLY;

    return isSignatory && notSigned && isCurrentChain && notWatchOnly;
  });

  useEffect(() => {
    setFeeTx(getMultisigTx(TEST_ADDRESS));

    if (!signAccount?.accountId) return;

    setApproveTx(getMultisigTx(signAccount?.accountId));
  }, [tx, signAccount?.accountId, txWeight]);

  useEffect(() => {
    if (!tx.transaction || !connection.api) return;
    if (isDecodedTx(tx.transaction)) return;

    getTxWeight(tx.transaction, connection.api).then(setTxWeight);
  }, [tx.transaction, connection.api]);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString) => {
    setSignature(signature);
    setIsModalOpen(false);
    setActiveStep(Step.SUBMIT);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setActiveStep(Step.CONFIRMATION);
  };

  const nativeAsset = connection.assets[0];

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

  const handleAccountSelect = async (account: Account) => {
    setSignAccount(account);

    const isValid = await validateBalanceForFee(account);

    if (isValid) {
      setActiveStep(Step.SCANNING);
    } else {
      toggleFeeModal();
    }

    toggleSelectAccountModal();
  };

  const selectAccount = () => {
    if (unsignedAccounts.length === 1) {
      setSignAccount(unsignedAccounts[0]);
      setActiveStep(Step.SCANNING);
    } else {
      toggleSelectAccountModal();
    }
  };

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
        title={<OperationModalTitle title={`${t(transactionTitle)} ${t('on')}`} chainId={tx.chainId} />}
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-[440px]"
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <>
            <Confirmation tx={tx} account={account} connection={connection} feeTx={feeTx} />
            <Button className="mt-7 ml-auto" prefixElement={<Icon name="vault" size={14} />} onClick={selectAccount}>
              {t('operation.signButton')}
            </Button>
          </>
        )}

        {activeStep === Step.SCANNING && approveTx && connection.api && signAccount && (
          <ScanSingleframeQr
            api={connection.api}
            chainId={tx.chainId}
            transaction={approveTx}
            account={signAccount}
            explorers={connection?.explorers}
            addressPrefix={connection?.addressPrefix}
            countdown={countdown}
            onResetCountdown={resetCountdown}
            onGoBack={goBack}
            onResult={(tx, txPayload) => {
              setUnsignedTx(tx);
              setTxPayload(txPayload);
              setActiveStep(Step.SIGNING);
            }}
          />
        )}

        {activeStep === Step.SIGNING && (
          <div>
            {approveTx && connection.api && signAccount && (
              <Signing
                api={connection.api}
                chainId={tx.chainId}
                transaction={approveTx}
                countdown={countdown}
                accountId={signAccount?.accountId}
                assetId={nativeAsset?.assetId.toString() || '0'}
                txPayload={txPayload}
                onGoBack={goBack}
                onStartOver={() => {}}
                onResult={onSignResult}
              />
            )}
          </div>
        )}

        <SignatorySelectModal
          isOpen={isSelectAccountModalOpen}
          accounts={unsignedAccounts}
          chain={connection}
          asset={nativeAsset}
          onClose={toggleSelectAccountModal}
          onSelect={handleAccountSelect}
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
