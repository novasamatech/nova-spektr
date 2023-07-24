import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { ChainId, HexString, AccountId, Address } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { toAddress, getRelaychainAsset, DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { Confirmation, Signing, Submit, Validators, NoAsset } from '../components';
import { useCountdown, useToggle } from '@renderer/shared/lib/hooks';
import { Alert, BaseModal, Button, Loader } from '@renderer/shared/ui';
import { Account, isMultisig, MultisigAccount } from '@renderer/domain/account';
import InitOperation, { ValidatorsResult } from './InitOperation/InitOperation';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import ScanMultiframeQr from '@renderer/components/common/Scanning/ScanMultiframeQr';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { isLightClient } from '@renderer/services/network/common/utils';
import { Paths } from '@renderer/app/providers';
import OperationModalTitle from '@renderer/screens/Operations/components/OperationModalTitle';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

export const ChangeValidators = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getActiveAccounts } = useAccount();
  const { getTransactionHash } = useTransaction();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isValidatorsModalOpen, toggleValidatorsModal] = useToggle(true);
  const [isAlertOpen, toggleAlert] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [validators, setValidators] = useState<ValidatorMap>({});

  const [description, setDescription] = useState('');

  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const accountIds = searchParams.get('id')?.split(',') || [];
  const chainId = params.chainId || ('' as ChainId);
  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    if (!activeAccounts.length || !accountIds.length) return;

    const accounts = activeAccounts.filter((a) => a.id && accountIds.includes(a.id.toString()));
    setAccounts(accounts);
  }, [activeAccounts.length]);

  const connection = connections[chainId];
  const [countdown, resetCountdown] = useCountdown(connection?.api);

  if (!connection || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeValidatorsModal = () => {
    toggleValidatorsModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-4 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isValidatorsModalOpen}
        title={<OperationModalTitle title={`${t('staking.validators.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeValidatorsModal}
      >
        <div className="w-[440px] px-5 py-4">
          <Loader className="my-24 mx-auto" color="primary" size={25} />
          <Button disabled className="w-fit flex-0 mt-7 ml-auto">
            {t('staking.bond.continueButton')}
          </Button>
        </div>
      </BaseModal>
    );
  }

  if (!asset) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-4 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isValidatorsModalOpen}
        title={<OperationModalTitle title={`${t('staking.validators.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeValidatorsModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isValidatorsModalOpen} onClose={closeValidatorsModal} />
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, signer, description }: ValidatorsResult) => {
    if (signer && isMultisig(accounts[0])) {
      setSigner(signer);
      setDescription(description || '');
    }

    setTxAccounts(accounts);
    setActiveStep(Step.VALIDATORS);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = getNominateTxs(Object.keys(validators));

    if (signer && isMultisig(txAccounts[0])) {
      const multisigTx = getMultisigTx(txAccounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
    }

    setTransactions(transactions);
    setValidators(validators);
    setActiveStep(Step.CONFIRMATION);
  };

  const getNominateTxs = (validators: Address[]): Transaction[] => {
    return txAccounts.map(({ accountId }) => {
      return {
        chainId,
        address: toAddress(accountId, { prefix: addressPrefix }),
        type: TransactionType.NOMINATE,
        args: { targets: validators },
      };
    });
  };

  const getMultisigTx = (
    account: MultisigAccount,
    signerAccountId: AccountId,
    transaction: Transaction,
  ): Transaction => {
    const { callData, callHash } = getTransactionHash(transaction, api);

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      if (s.accountId !== signerAccountId) {
        acc.push(toAddress(s.accountId, { prefix: addressPrefix }));
      }

      return acc;
    }, []);

    return {
      chainId,
      address: toAddress(signerAccountId, { prefix: addressPrefix }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        maybeTimepoint: null,
        callData,
        callHash,
      },
    };
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-4 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={activeStep !== Step.SUBMIT && isValidatorsModalOpen}
        title={<OperationModalTitle title={`${t('staking.validators.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeValidatorsModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.VALIDATORS && (
          <Validators
            api={api}
            chainId={chainId}
            asset={asset}
            explorers={explorers}
            addressPrefix={addressPrefix}
            isLightClient={isLightClient(connection)}
            onResult={onSelectValidators}
            onGoBack={goToPrevStep}
          />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            accounts={txAccounts}
            validators={Object.values(validators)}
            description={description}
            transaction={transactions[0]}
            multisigTx={multisigTx}
            signer={signer}
            onResult={() => setActiveStep(Step.SCANNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            {isAlertOpen && (
              <Alert title={t('staking.confirmation.hintTitle')} onClose={toggleAlert}>
                <Alert.Item>{t('staking.confirmation.hintNewValidators')}</Alert.Item>
              </Alert>
            )}
          </Confirmation>
        )}
        {activeStep === Step.SCANNING && (
          <div className="w-[440px] px-5 py-4">
            {transactions.length > 1 ? (
              <ScanMultiframeQr
                api={api}
                addressPrefix={addressPrefix}
                countdown={countdown}
                accounts={txAccounts}
                transactions={transactions}
                chainId={chainId}
                onGoBack={() => setActiveStep(Step.CONFIRMATION)}
                onResetCountdown={resetCountdown}
                onResult={onScanResult}
              />
            ) : (
              <ScanSingleframeQr
                api={api}
                addressPrefix={addressPrefix}
                countdown={countdown}
                account={signer || txAccounts[0]}
                transaction={multisigTx || transactions[0]}
                chainId={chainId}
                onGoBack={() => setActiveStep(Step.CONFIRMATION)}
                onResetCountdown={resetCountdown}
                onResult={(unsignedTx) => onScanResult([unsignedTx])}
              />
            )}
          </div>
        )}
        {activeStep === Step.SIGNING && (
          <Signing
            countdown={countdown}
            multiQr={transactions.length > 1}
            onResult={onSignResult}
            onGoBack={() => setActiveStep(Step.SCANNING)}
          />
        )}
      </BaseModal>
      {activeStep === Step.SUBMIT && (
        <Submit
          api={api}
          txs={transactions}
          multisigTx={multisigTx}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={txAccounts}
          description={description}
          onClose={toggleValidatorsModal}
        />
      )}
    </>
  );
};
