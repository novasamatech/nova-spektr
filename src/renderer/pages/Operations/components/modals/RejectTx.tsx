import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { BN } from '@polkadot/util';

import { BaseModal, Button, Icon } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { AccountDS, MultisigTransactionDS } from '@renderer/shared/api/storage';
import { useToggle } from '@renderer/shared/lib/hooks';
import { MultisigAccount, useAccount } from '@renderer/entities/account';
import { ExtendedChain } from '@renderer/entities/network';
import { Transaction, TransactionType, useTransaction, OperationResult } from '@renderer/entities/transaction';
import { Address, HexString, Timepoint } from '@renderer/domain/shared-kernel';
import { toAddress, transferableAmount } from '@renderer/shared/lib/utils';
import { getTransactionTitle } from '../../common/utils';
import { Submit } from '../ActionSteps/Submit';
import { useBalance } from '@renderer/entities/asset';
import RejectReasonModal from './RejectReasonModal';
import Confirmation from '@renderer/pages/Operations/components/ActionSteps/Confirmation';
import OperationModalTitle from '@renderer/pages/Operations/components/OperationModalTitle';
import { Signing } from '@renderer/features/operation';
import { useBalanceValidation } from '@renderer/entities/transaction/lib/useBalanceValidation';

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
  const { getBalance } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee } = useTransaction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectReasonModalOpen, toggleRejectReasonModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);

  const [rejectTx, setRejectTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

  const [rejectReason, setRejectReason] = useState('');
  const [signature, setSignature] = useState<HexString>();

  const accounts = getLiveAccounts();
  const signAccount = accounts.find((a) => a.accountId === tx.depositor);
  const transactionTitle = getTransactionTitle(tx.transaction);

  const nativeAsset = connection.assets[0];

  const balanceValidationError = useBalanceValidation({
    api: connection.api,
    chainId: tx.chainId,
    transaction: rejectTx,
    assetId: nativeAsset?.assetId.toString(),
  });

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
      address: signer,
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

  const validateBalanceForFee = async (signAccount: AccountDS): Promise<boolean> => {
    if (!connection.api || !rejectTx || !signAccount.accountId || !nativeAsset) return false;

    const fee = await getTransactionFee(rejectTx, connection.api);
    const balance = await getBalance(signAccount.accountId, connection.chainId, nativeAsset.assetId.toString());

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
        <Button size="sm" pallet="error" variant="fill" onClick={() => setIsModalOpen(true)}>
          {t('operation.rejectButton')}
        </Button>
      </div>

      <BaseModal
        closeButton
        isOpen={activeStep !== Step.SUBMIT && isModalOpen}
        title={
          <OperationModalTitle
            title={`${t('operation.cancelTitle')} ${t(transactionTitle)} ${t('on')}`}
            chainId={tx.chainId}
          />
        }
        panelClass="w-[440px]"
        headerClass="py-3 px-5 max-w-[440px]"
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        onClose={handleClose}
      >
        {activeStep === Step.CONFIRMATION && (
          <>
            <Confirmation tx={tx} account={account} connection={connection} feeTx={rejectTx} />
            <Button
              className="mt-7 ml-auto"
              prefixElement={<Icon name="vault" size={14} />}
              onClick={toggleRejectReasonModal}
            >
              {t('operation.signButton')}
            </Button>
          </>
        )}
        {activeStep === Step.SIGNING && rejectTx && connection.api && signAccount && (
          <Signing
            chainId={tx.chainId}
            api={connection.api}
            addressPrefix={connection?.addressPrefix}
            accounts={[signAccount]}
            transactions={[rejectTx]}
            signatory={signAccount}
            validationError={balanceValidationError}
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
          <Button onClick={toggleFeeModal}>{t('operation.feeErrorButton')}</Button>
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
