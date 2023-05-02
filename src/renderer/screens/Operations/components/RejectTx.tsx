import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';

import { BaseModal, Button } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS, MultisigTransactionDS } from '@renderer/services/storage';
import { useToggle, useCountdown } from '@renderer/shared/hooks';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import Chain from './Chain';
import { Signing } from './Signing/Signing';
import { Scanning } from './Scanning/Scanning';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Address, HexString, Timepoint } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/utils/address';
import { getAssetById } from '@renderer/shared/utils/assets';
import { useAccount } from '@renderer/services/account/accountService';
import { getTransactionTitle } from '../common/utils';
import Details from './Details';
import { Submit } from './Submit/Submit';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import ShortTransactionInfo from './ShortTransactionInfo';
import { Fee } from '@renderer/components/common';
import { useBalance } from '@renderer/services/balance/balanceService';
import { transferableAmount } from '@renderer/shared/utils/balance';
import { MAX_WEIGHT } from '@renderer/services/transaction/common/constants';
import RejectReasonModal from './RejectReasonModal';

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

const RejectTx = ({ tx, account, connection }: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee, getTxWeight } = useTransaction();

  const [isModalOpen, toggleModal] = useToggle(false);
  const [isRejectReasonModalOpen, toggleRejectReasonModal] = useToggle(false);
  const [isFeeModalOpen, toggleFeeModal] = useToggle(false);
  const [countdown, resetCountdown] = useCountdown(connection.api);

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [rejectReason, setRejectReason] = useState('');
  const [approveTx, setApproveTx] = useState<Transaction>();
  const [signature, setSignature] = useState<HexString>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();
  const [txWeight, setTxWeight] = useState<Weight>();

  const accounts = getLiveAccounts();
  const signAccount = accounts.find((a) => a.accountId === tx.depositor);
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
    const multisigTx = getMultisigTx(signAccount?.accountId || account.signatories[0].accountId);

    setApproveTx(multisigTx);
  }, [tx, accounts.length, signAccount?.accountId, txWeight]);

  useEffect(() => {
    if (!tx.transaction || !connection.api) return;

    getTxWeight(tx.transaction, connection.api).then((txWeight) => setTxWeight(txWeight));
  }, [tx, connection.api]);

  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets);

  const getMultisigTx = (signer: Address): Transaction => {
    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      const signerAddress = toAddress(signer, { prefix: connection?.addressPrefix });
      const signatoryAddress = toAddress(s.accountId, { prefix: connection?.addressPrefix });

      if (signerAddress !== signatoryAddress) {
        acc.push(signatoryAddress);
      }

      return acc;
    }, []);

    return {
      chainId: tx.chainId,
      address: signer,
      type: TransactionType.MULTISIG_CANCEL_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        maxWeight: txWeight || MAX_WEIGHT,
        callHash: tx.callHash,
        maybeTimepoint: {
          height: tx.blockCreated,
          index: tx.indexCreated,
        } as Timepoint,
      },
    };
  };

  const validateBalanceForFee = async (signAccount: AccountDS): Promise<boolean> => {
    if (!connection.api || !approveTx || !signAccount.accountId || !asset) return false;

    const fee = await getTransactionFee(approveTx, connection.api);
    const balance = await getBalance(signAccount.accountId, connection.chainId, asset.assetId.toString());

    if (!balance) return false;

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  };

  const cancellable = tx.status === 'SIGNING' && signAccount;

  if (!cancellable) return <></>;

  const handleRejectReason = async (reason: string) => {
    const isValid = await validateBalanceForFee(signAccount);

    if (isValid) {
      setRejectReason(reason);
      setActiveStep(Step.SCANNING);
    } else {
      toggleFeeModal();
    }
  };

  return (
    <>
      <div className="flex justify-between">
        <Button pallet="error" variant="fill" onClick={toggleModal}>
          {t('operation.rejectButton')}
        </Button>
      </div>

      <BaseModal
        isOpen={isModalOpen}
        closeButton
        title={
          <div className="flex items-center">
            {t('operation.cancelTitle')} {t(transactionTitle)} {t('on')} <Chain chainId={tx.chainId} />
          </div>
        }
        contentClass="px-5 pb-4 h-3/4 w-[520px]"
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-center">{tx.transaction && <ShortTransactionInfo tx={tx.transaction} />} </div>

            {tx.description && <div className="flex justify-center bg-shade-5 rounded-2lg">{tx.description}</div>}

            <Details tx={tx} account={account} connection={connection} withAdvanced={false} />

            <div className="flex justify-between items-center">
              <div className="text-shade-40">{t('operation.networkFee')}</div>
              <div>
                {connection.api && approveTx && (
                  <Fee
                    className="text-shade-40"
                    api={connection.api}
                    asset={connection.assets[0]}
                    transaction={approveTx}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button pallet="primary" variant="fill" onClick={toggleRejectReasonModal}>
                {t('operation.signButton')}
              </Button>
            </div>
          </div>
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
              <Button pallet="shade" variant="fill" onClick={goBack}>
                {t('operation.goBackButton')}
              </Button>

              <Button pallet="primary" variant="fill" onClick={() => setActiveStep(Step.SIGNING)}>
                {t('operation.continueButton')}
              </Button>
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
                onStartOver={() => {}}
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
                rejectReason={rejectReason}
              />
            )}
          </div>
        )}

        <RejectReasonModal
          isOpen={isRejectReasonModalOpen}
          onClose={toggleRejectReasonModal}
          onSubmit={handleRejectReason}
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
      </BaseModal>
    </>
  );
};

export default RejectTx;
