import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { toAddress } from '@renderer/shared/utils/address';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { RewardsDestination } from '@renderer/domain/stake';
import { ButtonLink, Icon } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { Address, ChainId, HexString, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { Validators, Confirmation, MultiScanning, Signing, SingleScanning } from '../components';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { BaseModal, Alert } from '@renderer/components/ui-redesign';
import InitOperation, { BondResult } from './InitOperation/InitOperation';
import Paths from '@renderer/routes/paths';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';
import OperationModalTitle from '@renderer/screens/Operations/components/OperationModalTitle';
import { useAccount } from '@renderer/services/account/accountService';
import { AccountDS } from '@renderer/services/storage';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

type Destination = {
  address?: Address;
  type: RewardsDestination;
};

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getChainById } = useChains();
  const { getActiveAccounts } = useAccount();
  const { getTransactionHash } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isBondModalOpen, toggleBondModal] = useToggle(true);
  const [isAlertOpen, toggleAlert] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');

  const [validators, setValidators] = useState<ValidatorMap>({});
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [accountsToStake, setAccountsToStake] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<Destination>();
  // const [description, setDescription] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  // const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  // const [signatures, setSignatures] = useState<HexString[]>([]);

  const accountIds = searchParams.get('id')?.split(',') || [];
  const chainId = params.chainId || ('' as ChainId);
  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    if (!activeAccounts.length || !accountIds.length) return;

    const accounts = activeAccounts.filter((a) => a.id && accountIds.includes(a.id.toString()));
    setAccounts(accounts);
  }, [activeAccounts.length]);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  const connection = connections[chainId];
  const [countdown, resetCountdown] = useCountdown(connection?.api);

  if (!connection || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  if (!asset) {
    return (
      <BaseModal isOpen closeButton title="TEST" onClose={() => console.log('close')}>
        <div className="flex flex-col h-full relative">
          {/*{headerContent}*/}

          <div className="flex w-full h-full flex-col items-center justify-center">
            <Icon name="noResults" size={380} />
            <p className="text-neutral text-3xl font-bold">{t('staking.bond.noStakingAssetLabel')}</p>
            <p className="text-neutral-variant text-base font-normal">
              {t('staking.bond.noStakingAssetDescription', { chainName: name })}
            </p>
            <ButtonLink className="mt-5" to={Paths.STAKING} variant="fill" pallet="primary" weight="lg">
              {t('staking.bond.goToStakingButton')}
            </ButtonLink>
          </div>
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, destination, amount, signer, description }: BondResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    setSigner(signer);
    // setDescription(description || '');
    setDestination(destPayload);
    setAccountsToStake(accounts);
    setStakeAmount(amount);
    setActiveStep(Step.VALIDATORS);
  };

  const getBondTxs = (validators: Address[]): Transaction[] => {
    return accountsToStake.map(({ accountId }) => {
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

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = getBondTxs(Object.keys(validators));

    if (signer && isMultisig(accountsToStake[0])) {
      const multisigTx = getMultisigTx(accountsToStake[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
    }

    setTransactions(transactions);
    setValidators(validators);
    setActiveStep(Step.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    // setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Step.SCANNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    // setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const closeBondModal = () => {
    toggleBondModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const bondValues = new Array(accountsToStake.length).fill(stakeAmount);

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-max"
      isOpen={isBondModalOpen}
      title={<OperationModalTitle title={`${t('staking.bond.title', { asset: asset.symbol })}`} chainId={chainId} />}
      onClose={closeBondModal}
    >
      {activeStep === Step.INIT && (
        <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
      )}
      {activeStep === Step.VALIDATORS && (
        <Validators
          api={api}
          chainId={chainId}
          onResult={onSelectValidators}
          onGoBack={goToPrevStep}
          {...explorersProps}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          validators={Object.values(validators)}
          accounts={accountsToStake}
          amounts={bondValues}
          destination={destination}
          transaction={transactions[0]}
          multisigTx={multisigTx}
          onResult={() => setActiveStep(Step.SCANNING)}
          onGoBack={goToPrevStep}
          {...explorersProps}
        >
          {isAlertOpen && (
            <Alert title="Learn more about rewards" onClose={toggleAlert}>
              <Alert.Item>{t('staking.confirmation.hintRewards')}</Alert.Item>
              <Alert.Item>{t('staking.confirmation.hintUnstakePeriod')}</Alert.Item>
              <Alert.Item>{t('staking.confirmation.hintNoRewards')}</Alert.Item>
              <Alert.Item>{t('staking.confirmation.hintRedeem')}</Alert.Item>
            </Alert>
          )}
        </Confirmation>
      )}
      {activeStep === Step.SCANNING &&
        (transactions.length > 1 ? (
          <MultiScanning
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            accounts={accountsToStake}
            transactions={transactions}
            chainId={chainId}
            onResetCountdown={resetCountdown}
            onResult={onScanResult}
          />
        ) : (
          <SingleScanning
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            account={signer || accountsToStake[0]}
            transaction={multisigTx || transactions[0]}
            chainId={chainId}
            onResetCountdown={resetCountdown}
            onResult={(unsignedTx) => onScanResult([unsignedTx])}
          />
        ))}
      {activeStep === Step.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={onBackToScan}
        />
      )}
      {activeStep === Step.SUBMIT && (
        //eslint-disable-next-line i18next/no-literal-string
        <div>Submit</div>
        // <Submit
        //   api={api}
        //   multisigTx={multisigTx}
        //   transaction={transactions[0]}
        //   signatures={signatures}
        //   unsignedTx={unsignedTransactions}
        //   validators={Object.values(validators)}
        //   accounts={accountsToStake}
        //   amounts={bondValues}
        //   description={description}
        //   destination={destination}
        //   {...explorersProps}
        // >
        //   {infoAlert}
        // </Submit>
      )}
    </BaseModal>
  );
};

export default Bond;
