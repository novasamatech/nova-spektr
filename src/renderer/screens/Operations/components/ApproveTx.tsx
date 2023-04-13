import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';

import { Address, BaseModal, Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS, MultisigTransactionDS } from '@renderer/services/storage';
import { useToggle } from '@renderer/shared/hooks';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import Chain from './Chain';
import { Signing } from './Signing/Signing';
import { Scanning } from './Scanning/Scanning';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { AccountID, HexString, Timepoint } from '@renderer/domain/shared-kernel';
import { formatAddress } from '@renderer/shared/utils/address';
import { getAssetById } from '@renderer/shared/utils/assets';
import { useAccount } from '@renderer/services/account/accountService';
import { getTransactionTitle } from '../common/utils';
import Details from './Details';
import { Submit } from './Submit/Submit';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import ShortTransactionInfo from './ShortTransactionInfo';
import { Fee } from '@renderer/components/common';
import { useCountdown } from '@renderer/screens/Staking/Operations/hooks/useCountdown';
import { useBalance } from '@renderer/services/balance/balanceService';
import { transferableAmount } from '@renderer/services/balance/common/utils';
import { MAX_WEIGHT } from '@renderer/services/transaction/common/constants';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';

type Props = {
  tx: MultisigTransactionDS & { rowIndex: number };
  account: MultisigAccount;
  connection: ExtendedChain;
};

const enum Step {
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const ApproveTx = ({ tx, account, connection }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleModal] = useToggle(false);
  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle(false);
  const [isFeeModalOpen, toggleFeeModal] = useToggle(false);
  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);
  const [countdown, resetCountdown] = useCountdown(connection.api);

  const { getBalance } = useBalance();
  const { getTransactionFee, getTxWeight } = useTransaction();
  const { getLiveAccounts } = useAccount();

  const accounts = getLiveAccounts();

  const unsignedAccounts = accounts.filter(
    (a) =>
      account.signatories.find((s) => s.publicKey === a.publicKey) &&
      !tx.events.find((e) => e.accountId === a.publicKey),
  );

  const [approveTx, setApproveTx] = useState<Transaction>();
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

  const [signAccount, setSignAccount] = useState<AccountDS>();

  useEffect(() => {
    const multisigTx = getMultisigTx(signAccount?.accountId || TEST_ADDRESS);

    setApproveTx(multisigTx);
  }, [tx, accounts.length, signAccount?.accountId, txWeight]);

  useEffect(() => {
    if (!tx.transaction || !connection.api) return;

    getTxWeight(tx.transaction, connection.api).then((txWeight) => setTxWeight(txWeight));
  }, [tx, connection.api]);

  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets);

  const getMultisigTx = (signer: AccountID): Transaction => {
    const chainId = tx.chainId;

    const otherSignatories = account.signatories.reduce<AccountID[]>((acc, s) => {
      const signerAddress = formatAddress(signer, connection?.addressPrefix);
      const signatoryAddress = formatAddress(s.accountId, connection?.addressPrefix);

      if (signerAddress !== signatoryAddress) {
        acc.push(signatoryAddress);
      }

      return acc;
    }, []);

    return {
      chainId,
      address: signer,
      type: tx.callData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories,
        maxWeight: txWeight || MAX_WEIGHT,
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
    if (!connection.api || !approveTx || !signAccount.publicKey || !asset) return false;

    const fee = await getTransactionFee(approveTx, connection.api);

    console.log(fee);

    const balance = await getBalance(signAccount.publicKey, connection.chainId, asset.assetId.toString());

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

  return (
    <>
      <div className="flex justify-between">
        <Button pallet="primary" variant="fill" onClick={toggleModal}>
          {t('operation.approveButton')}
        </Button>
      </div>

      <BaseModal
        isOpen={isModalOpen}
        closeButton
        title={
          <div className="flex items-center">
            {t(transactionTitle)} {t('on')} <Chain chainId={tx.chainId} />
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
              <Button pallet="primary" variant="fill" onClick={selectAccount}>
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
                multisigAccount={account}
                account={signAccount}
                unsignedTx={unsignedTx}
                signature={signature}
              />
            )}
          </div>
        )}

        <BaseModal
          closeButton
          isOpen={isSelectAccountModalOpen}
          title={t('operation.selectSignatory')}
          contentClass="px-5 pb-4 w-[520px]"
          onClose={toggleSelectAccountModal}
        >
          <ul>
            {unsignedAccounts.map((a) => (
              <li
                className="flex justify-between items-center p-1 hover:bg-shade-5 cursor-pointer"
                key={a.id}
                onClick={() => handleAccountSelect(a)}
              >
                <Address address={a.accountId || ''} name={a.name} />

                <Icon className="text-shade-40" name="right" />
              </li>
            ))}
          </ul>
        </BaseModal>

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

export default ApproveTx;
