import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';

import { Icon } from '@renderer/components/ui';
import { Button, BaseModal } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS, MultisigTransactionDS } from '@renderer/services/storage';
import { useToggle, useCountdown } from '@renderer/shared/hooks';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { Transaction, TransactionType, isDecodedTx } from '@renderer/domain/transaction';
import { Address, HexString, Timepoint } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/utils/address';
import { useAccount } from '@renderer/services/account/accountService';
import { getTransactionTitle } from '../../common/utils';
import { Submit } from '../ActionSteps/Submit';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { transferableAmount } from '@renderer/shared/utils/balance';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import Confirmation from '@renderer/screens/Operations/components/ActionSteps/Confirmation';
import SignatorySelectModal from '@renderer/screens/Operations/components/modals/SignatorySelectModal';
import { OperationResult } from '@renderer/components/common/OperationResult/OperationResult';
import OperationModalTitle from '@renderer/screens/Operations/components/OperationModalTitle';
import { Signing } from '@renderer/screens/Transfer/components/ActionSteps';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { useMultisigEvent } from '@renderer/services/multisigEvent/multisigEventService';

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
  const { getLiveTxEvents } = useMultisigEvent();
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

  const [txWeight, setTxWeight] = useState<Weight>();
  const [signature, setSignature] = useState<HexString>();

  const accounts = getLiveAccounts();
  const transactionTitle = getTransactionTitle(tx.transaction);

  const unsignedAccounts = accounts.filter((a) => {
    const isSignatory = account.signatories.find((s) => s.accountId === a.accountId);
    const notSigned = !events.find((e) => e.accountId === a.accountId);
    const isCurrentChain = !a.chainId || a.chainId === tx.chainId;

    return isSignatory && notSigned && isCurrentChain;
  });

  useEffect(() => {
    if (!signAccount?.accountId) return;

    setApproveTx(getMultisigTx(signAccount?.accountId));
  }, [tx, accounts.length, signAccount?.accountId, txWeight]);

  useEffect(() => {
    setFeeTx(getMultisigTx(TEST_ADDRESS));
  }, [tx, accounts.length, signAccount?.accountId, txWeight]);

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
    const chainId = tx.chainId;

    const otherSignatories = account.signatories
      .reduce<Address[]>((acc, s) => {
        const signerAddress = toAddress(signer, { prefix: connection?.addressPrefix });
        const signatoryAddress = toAddress(s.accountId, { prefix: connection?.addressPrefix });

        if (signerAddress !== signatoryAddress) {
          acc.push(signatoryAddress);
        }

        return acc;
      }, [])
      .sort();

    return {
      chainId,
      address: signer,
      type: tx.callData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories,
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

  const handleAccountSelect = async (a: AccountDS) => {
    setSignAccount(a);

    const isValid = await validateBalanceForFee(a);

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

  if (!(readyForFinalSign || readyForNonFinalSign)) return <></>;

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
        headerClass="py-4 px-5 max-w-[440px]"
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
            onResult={(tx) => {
              setUnsignedTx(tx);
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
                assetId={nativeAsset?.assetId.toString() || '0'}
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
