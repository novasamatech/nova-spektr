import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { toAddress, getRelaychainAsset, DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { RewardsDestination, ValidatorMap } from '@renderer/entities/staking';
import { useI18n, useNetworkContext, Paths } from '@renderer/app/providers';
import { Address, ChainId, HexString, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { Validators, Confirmation, Submit, NoAsset } from '../components';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Account, MultisigAccount, isMultisig, useAccount } from '@renderer/entities/account';
import { BaseModal, Alert, Button, Loader } from '@renderer/shared/ui';
import InitOperation, { BondResult } from './InitOperation/InitOperation';
import { OperationTitle } from '@renderer/components/common';
import { DestinationType } from '../common/types';
import { UnstakingDuration } from '@renderer/pages/Staking/Overview/components';
import { isLightClient } from '@renderer/entities/network';
import { Signing } from '@renderer/features/operation';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

export const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { getTransactionHash } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isBondModalOpen, toggleBondModal] = useToggle(true);
  const [isAlertOpen, toggleAlert] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);

  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<DestinationType>();
  const [description, setDescription] = useState('');

  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const accountIds = searchParams.get('id')?.split(',') || [];
  const chainId = params.chainId || ('' as ChainId);
  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    if (!activeAccounts.length || !accountIds.length) return;

    const accounts = activeAccounts.filter((a) => a.id && accountIds.includes(a.id.toString()));
    setAccounts(accounts);
  }, [activeAccounts.length, activeAccounts.length && activeAccounts[0].accountId]);

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

  const closeBondModal = () => {
    toggleBondModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isBondModalOpen}
        title={<OperationTitle title={`${t('staking.bond.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeBondModal}
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
        isOpen={isBondModalOpen}
        title={<OperationTitle title={`${t('staking.bond.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeBondModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isBondModalOpen} onClose={closeBondModal} />
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, destination, amount, signer, description }: BondResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    if (signer && isMultisig(accounts[0])) {
      setSigner(signer);
      setDescription(description || '');
    }

    setDestination(destPayload);
    setTxAccounts(accounts);
    setStakeAmount(amount);
    setActiveStep(Step.VALIDATORS);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = getBondTxs(Object.keys(validators));

    if (signer && isMultisig(txAccounts[0])) {
      const multisigTx = getMultisigTx(txAccounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
    }

    setTransactions(transactions);
    setValidators(validators);
    setActiveStep(Step.CONFIRMATION);
  };

  const getBondTxs = (validators: Address[]): Transaction[] => {
    return txAccounts.map(({ accountId }) => {
      const address = toAddress(accountId, { prefix: addressPrefix });
      const commonPayload = { chainId, address };

      const bondTx = {
        ...commonPayload,
        type: TransactionType.BOND,
        args: {
          value: stakeAmount,
          controller: address,
          payee: destination?.type === RewardsDestination.TRANSFERABLE ? { Account: destination.address } : 'Staked',
        },
      };

      const nominateTx = {
        ...commonPayload,
        type: TransactionType.NOMINATE,
        args: { targets: validators },
      };

      return {
        ...commonPayload,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [bondTx, nominateTx] },
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
  const bondValues = new Array(txAccounts.length).fill(stakeAmount);

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        headerClass="py-3 px-5 max-w-[440px]"
        isOpen={activeStep !== Step.SUBMIT && isBondModalOpen}
        title={<OperationTitle title={`${t('staking.bond.title', { asset: asset.symbol })}`} chainId={chainId} />}
        onClose={closeBondModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.VALIDATORS && (
          <Validators
            api={api}
            chainId={chainId}
            isLightClient={isLightClient(connection)}
            onResult={onSelectValidators}
            onGoBack={goToPrevStep}
            {...explorersProps}
          />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            validators={Object.values(validators)}
            accounts={txAccounts}
            signer={signer}
            amounts={bondValues}
            description={description}
            destination={destination}
            transaction={transactions[0]}
            multisigTx={multisigTx}
            onResult={() => setActiveStep(Step.SIGNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            {isAlertOpen && (
              <Alert title={t('staking.confirmation.hintTitle')} onClose={toggleAlert}>
                <Alert.Item>{t('staking.confirmation.hintRewards')}</Alert.Item>
                <Alert.Item>
                  {t('staking.confirmation.hintUnstakePeriod')} {'('}
                  <UnstakingDuration api={api} />
                  {')'}
                </Alert.Item>
                <Alert.Item>{t('staking.confirmation.hintNoRewards')}</Alert.Item>
                <Alert.Item>{t('staking.confirmation.hintWithdraw')}</Alert.Item>
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
          onClose={toggleBondModal}
        />
      )}
    </>
  );
};
