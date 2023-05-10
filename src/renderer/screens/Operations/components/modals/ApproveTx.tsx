import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';

import { BaseModal, Button, Icon } from '@renderer/components/ui';
import { Button as ButtonRedesign, BaseModal as BaseModalRedesign } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import Chain from '../Chain';
import { Signing } from '../ActionSteps/Signing';
import { Scanning } from '../ActionSteps/Scanning';
import { MultisigTransaction, Transaction, TransactionType } from '@renderer/domain/transaction';
import { Address, HexString, Timepoint } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/utils/address';
import { getAssetById } from '@renderer/shared/utils/assets';
import { useAccount } from '@renderer/services/account/accountService';
import { getTransactionTitle } from '../../common/utils';
import { Submit } from '../ActionSteps/Submit';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useCountdown } from '@renderer/screens/Staking/Operations/hooks/useCountdown';
import { useBalance } from '@renderer/services/balance/balanceService';
import { transferableAmount } from '@renderer/services/balance/common/utils';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import Confirmation from '@renderer/screens/Operations/components/ActionSteps/Confirmation';
import SignatorySelectModal from '@renderer/screens/Operations/components/modals/SignatorySelectModal';

type Props = {
  tx: MultisigTransaction;
  account: MultisigAccount;
  connection: ExtendedChain;
};

const enum Step {
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

export const ChainFontStyle = 'font-manrope text-modal-title text-text-primary';

const ApproveTx = ({ tx, account, connection }: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee, getTxWeight } = useTransaction();

  const [isModalOpen, toggleModal] = useToggle(false);
  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle(false);
  const [isFeeModalOpen, toggleFeeModal] = useToggle(false);
  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [countdown, resetCountdown] = useCountdown(connection.api);
  const [signAccount, setSignAccount] = useState<AccountDS>();

  const accounts = getLiveAccounts();

  const unsignedAccounts = accounts.filter(
    (a) =>
      account.signatories.find((s) => s.accountId === a.accountId) &&
      !tx.events.find((e) => e.accountId === a.accountId),
  );

  const [approveTx, setApproveTx] = useState<Transaction>();
  const [feeTx, setFeeTx] = useState<Transaction>();
  const [signature, setSignature] = useState<HexString>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [txWeight, setTxWeight] = useState<Weight>();

  const transactionTitle = getTransactionTitle(tx.transaction);

  const goBack = () => {
    setActiveStep(Step.CONFIRMATION);
  };

  const onSignResult = (signature: HexString) => {
    setSignature(signature);
    setActiveStep(Step.SUBMIT);
  };

  const handleClose = () => {
    toggleModal();
    setActiveStep(Step.CONFIRMATION);
  };

  useEffect(() => {
    if (!signAccount?.accountId || !txWeight) return;

    const multisigTx = getMultisigTx(signAccount?.accountId);

    setApproveTx(multisigTx);
  }, [tx, accounts.length, signAccount?.accountId, txWeight]);

  useEffect(() => {
    const feeTx = getMultisigTx(TEST_ADDRESS);

    setFeeTx(feeTx);
  }, [tx, accounts.length, signAccount?.accountId, txWeight]);

  useEffect(() => {
    if (!tx.transaction || !connection.api) return;

    getTxWeight(tx.transaction, connection.api).then((txWeight) => {
      setTxWeight(txWeight);
    });
  }, [tx.transaction, connection.api]);

  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets);

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
    if (!connection.api || !feeTx || !signAccount.accountId || !asset) return false;

    const fee = await getTransactionFee(feeTx, connection.api);

    const balance = await getBalance(signAccount.accountId, connection.chainId, asset.assetId.toString());

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

  const thresholdReached = tx.events.filter((e) => e.status === 'SIGNED').length === account.threshold - 1;

  const readyForSign = tx.status === 'SIGNING' && unsignedAccounts.length > 0;
  const readyForNonFinalSign = readyForSign && !thresholdReached;
  const readyForFinalSign = readyForSign && thresholdReached && !!tx.callData;

  if (!(readyForFinalSign || readyForNonFinalSign)) return <></>;

  const approveTitile = (
    <div className="flex items-center py-1 ml-4">
      {t(transactionTitle)} {t('on')}
      <Chain className="ml-0.5" chainId={tx.chainId} fontProps={{ className: ChainFontStyle, fontWeight: 'bold' }} />
    </div>
  );

  return (
    <>
      <ButtonRedesign size="sm" onClick={toggleModal}>
        {t('operation.approveButton')}
      </ButtonRedesign>

      <BaseModalRedesign
        isOpen={isModalOpen}
        closeButton
        title={approveTitile}
        panelClass="w-[440px]"
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <>
            <Confirmation tx={tx} account={account} connection={connection} feeTx={feeTx} />
            <ButtonRedesign
              className="mt-7 ml-auto"
              prefixElement={<Icon name="vault" size={14} />}
              onClick={selectAccount}
            >
              {t('operation.signButton')}
            </ButtonRedesign>
          </>
        )}
        {activeStep === Step.SCANNING && (
          <>
            {approveTx && connection.api && signAccount && (
              <Scanning
                api={connection.api}
                chainId={tx.chainId}
                transaction={approveTx}
                account={signAccount}
                explorers={connection?.explorers}
                addressPrefix={connection?.addressPrefix}
                countdown={countdown}
                onResetCountdown={resetCountdown}
                onResult={setUnsignedTx}
              />
            )}

            <div className="flex w-full justify-between">
              <ButtonRedesign variant="text" onClick={goBack}>
                {t('operation.goBackButton')}
              </ButtonRedesign>

              <ButtonRedesign onClick={() => setActiveStep(Step.SIGNING)}>
                {t('operation.continueButton')}
              </ButtonRedesign>
            </div>
          </>
        )}

        {activeStep === Step.SIGNING && (
          <div>
            {approveTx && connection.api && signAccount && (
              <Signing
                api={connection.api}
                chainId={tx.chainId}
                transaction={approveTx}
                account={signAccount}
                explorers={connection.explorers}
                addressPrefix={connection.addressPrefix}
                countdown={countdown}
                assetId={asset?.assetId.toString() || '0'}
                onGoBack={() => {}}
                onStartOver={goBack}
                onResult={onSignResult}
              />
            )}
          </div>
        )}
        {activeStep === Step.SUBMIT && (
          <div>
            {approveTx && connection.api && signAccount && signature && unsignedTx && (
              <Submit
                tx={approveTx}
                api={connection.api}
                multisigTx={tx}
                matrixRoomId={account.matrixRoomId}
                account={signAccount}
                unsignedTx={unsignedTx}
                signature={signature}
              />
            )}
          </div>
        )}

        <SignatorySelectModal
          isOpen={isSelectAccountModalOpen}
          accounts={unsignedAccounts}
          explorers={connection.explorers}
          chainId={connection.chainId}
          asset={asset}
          onClose={toggleSelectAccountModal}
          onSelect={handleAccountSelect}
        />

        <BaseModal
          closeButton
          isOpen={isFeeModalOpen}
          title={t('operation.feeErrorTitle')}
          contentClass="px-5 pb-4 w-[260px] flex flex-col items-center"
          onClose={toggleFeeModal}
        >
          <div>{t('operation.feeErrorMessage')}</div>

          <Button pallet="primary" variant="fill" onClick={toggleFeeModal}>
            {t('operation.feeErrorButton')}
          </Button>
        </BaseModal>
      </BaseModalRedesign>
    </>
  );
};

export default ApproveTx;
