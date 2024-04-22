import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigTransactionDS } from '@shared/api/storage';
import { useToggle } from '@shared/lib/hooks';
import { ExtendedChain } from '@entities/network';
import { toAddress, transferableAmount, getAssetById } from '@shared/lib/utils';
import { getMultisigSignOperationTitle } from '../../common/utils';
import RejectReasonModal from './RejectReasonModal';
import { Submit } from '../ActionSteps/Submit';
import { Confirmation } from '../ActionSteps/Confirmation';
import { SigningSwitch } from '@features/operations';
import { OperationTitle } from '@entities/chain';
import { walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import type { Address, HexString, Timepoint, MultisigAccount, Account } from '@shared/core';
import { balanceModel, balanceUtils } from '@entities/balance';
import {
  Transaction,
  TransactionType,
  OperationResult,
  validateBalance,
  isXcmTransaction,
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

const RejectTx = ({ tx, account, connection }: Props) => {
  const { t } = useI18n();
  // const wallets = keyBy(useUnit(walletModel.$wallets), 'id');

  const wallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectReasonModalOpen, toggleRejectReasonModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);

  const [rejectTx, setRejectTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

  const [rejectReason, setRejectReason] = useState('');
  const [signature, setSignature] = useState<HexString>();

  const transactionTitle = getMultisigSignOperationTitle(
    isXcmTransaction(tx.transaction),
    t,
    TransactionType.MULTISIG_CANCEL_AS_MULTI,
    tx,
  );

  const nativeAsset = connection.assets[0];
  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets);

  const signAccount = walletUtils.getWalletAndAccounts(wallets, {
    walletFn: (wallet) => !walletUtils.isWatchOnly(wallet),
    accountFn: (account) => account.accountId === tx.depositor,
  })?.accounts[0];

  const checkBalance = () =>
    validateBalance({
      api: connection.api,
      chainId: tx.chainId,
      transaction: rejectTx,
      assetId: nativeAsset.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee: transactionService.getTransactionFee,
    });

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    const accountId = signAccount?.accountId || account.signatories[0].accountId;

    setRejectTx(getMultisigTx(accountId));
  }, [tx, signAccount?.accountId]);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTx(unsigned[0]);
    setSignature(signature[0]);
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
      type: TransactionType.MULTISIG_CANCEL_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        callHash: tx.callHash,
        maybeTimepoint: {
          height: tx.blockCreated,
          index: tx.indexCreated,
        } as Timepoint,
      },
    };
  };

  const validateBalanceForFee = async (signAccount: Account): Promise<boolean> => {
    if (!connection.api || !rejectTx || !signAccount.accountId || !nativeAsset) return false;

    const fee = await transactionService.getTransactionFee(rejectTx, connection.api);
    const balance = balanceUtils.getBalance(
      balances,
      signAccount.accountId,
      connection.chainId,
      nativeAsset.assetId.toString(),
    );

    if (!balance) return false;

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  };

  const cancellable = tx.status === 'SIGNING' && signAccount;
  if (!cancellable) return null;

  const handleRejectReason = async (reason: string) => {
    const isValid = await validateBalanceForFee(signAccount);

    if (isValid) {
      setRejectReason(reason);
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  const isSubmitStep = activeStep === Step.SUBMIT && rejectTx && signAccount && signature && unsignedTx;

  return (
    <>
      <div className="flex justify-between">
        <Button pallet="error" variant="fill" onClick={() => setIsModalOpen(true)}>
          {t('operation.rejectButton')}
        </Button>
      </div>

      <BaseModal
        closeButton
        isOpen={activeStep !== Step.SUBMIT && isModalOpen}
        title={<OperationTitle title={t(transactionTitle, { asset: asset?.symbol })} chainId={tx.chainId} />}
        panelClass="w-[440px]"
        headerClass="py-3 pl-5 pr-3"
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            tx={tx}
            account={account}
            connection={connection}
            feeTx={rejectTx}
            signatory={signAccount}
            onSign={toggleRejectReasonModal}
          />
        )}
        {activeStep === Step.SIGNING && rejectTx && connection.api && signAccount && (
          <SigningSwitch
            chainId={tx.chainId}
            api={connection.api}
            addressPrefix={connection?.addressPrefix}
            accounts={[signAccount]}
            transactions={[rejectTx]}
            signatory={signAccount}
            validateBalance={checkBalance}
            onGoBack={goBack}
            onResult={onSignResult}
          />
        )}

        <RejectReasonModal
          isOpen={isRejectReasonModalOpen}
          onClose={toggleRejectReasonModal}
          onSubmit={handleRejectReason}
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
          isReject
          tx={rejectTx}
          api={connection.api}
          multisigTx={tx}
          matrixRoomId={account.matrixRoomId}
          account={signAccount}
          unsignedTx={unsignedTx}
          signature={signature}
          rejectReason={rejectReason}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default RejectTx;
