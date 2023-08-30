import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useI18n, useNetworkContext, Paths } from '@renderer/app/providers';
import { ChainId, HexString, AccountId, Address } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { useAccount, Account, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { ValidatorMap } from '@renderer/entities/staking';
import { toAddress, getRelaychainAsset, DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { Confirmation, Submit, Validators, NoAsset } from '../components';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Alert, BaseModal, Button, Loader } from '@renderer/shared/ui';
import InitOperation, { ValidatorsResult } from './InitOperation/InitOperation';
import { isLightClient } from '@renderer/entities/network';
import { OperationTitle } from '@renderer/components/common';
import { Signing } from '@renderer/features/operation';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
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
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isValidatorsModalOpen}
        title={<OperationTitle title={`${t('staking.validators.title', { asset: '' })}`} chainId={chainId} />}
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
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isValidatorsModalOpen}
        title={<OperationTitle title={`${t('staking.validators.title', { asset: '' })}`} chainId={chainId} />}
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

  const onSignResult = (signatures: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        headerClass="py-3 px-5 max-w-[440px]"
        isOpen={activeStep !== Step.SUBMIT && isValidatorsModalOpen}
        title={<OperationTitle title={`${t('staking.validators.title', { asset: '' })}`} chainId={chainId} />}
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
            onResult={() => setActiveStep(Step.SIGNING)}
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
        {activeStep === Step.SIGNING && (
          <Signing
            chainId={chainId}
            api={api}
            addressPrefix={addressPrefix}
            signatory={signer}
            accounts={txAccounts}
            transactions={multisigTx ? [multisigTx] : transactions}
            onGoBack={() => setActiveStep(Step.CONFIRMATION)}
            onResult={onSignResult}
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
