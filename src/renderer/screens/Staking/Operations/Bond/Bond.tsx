import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { toAddress } from '@renderer/shared/utils/address';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { RewardsDestination } from '@renderer/domain/stake';
import { ButtonBack, ButtonLink, HintList, Icon } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { Address, ChainId, HexString, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import InitOperation, { BondResult } from './InitOperation/InitOperation';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { Validators, Confirmation, MultiScanning, Signing, Submit } from '../components';
import { useCountdown } from '@renderer/shared/hooks';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Scanning } from '@renderer/components/common/Scanning/Scanning';

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

const HeaderTitles: Record<Step, string> = {
  [Step.INIT]: 'staking.bond.initBondSubtitle',
  [Step.VALIDATORS]: 'staking.bond.validatorsSubtitle',
  [Step.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getChainById } = useChains();
  const { getTransactionHash } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');

  const [validators, setValidators] = useState<ValidatorMap>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<Destination>();
  const [description, setDescription] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);
  const [countdown, resetCountdown] = useCountdown(api);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const headerContent = (
    <div className="flex items-center gap-x-2.5 mb-9 mt-5 px-5">
      <ButtonBack onCustomReturn={goToPrevStep}>
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t(HeaderTitles[activeStep])}</h1>
      </ButtonBack>
    </div>
  );

  if (!asset) {
    return (
      <div className="flex flex-col h-full relative">
        {headerContent}

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
    );
  }

  const onInitResult = ({ accounts, destination, amount, signer, description }: BondResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    setSigner(signer);
    setDescription(description || '');
    setDestination(destPayload);
    setAccounts(accounts);
    setStakeAmount(amount);
    setActiveStep(Step.VALIDATORS);
  };

  const getBondTxs = (validators: Address[]): Transaction[] => {
    return accounts.map(({ accountId }) => {
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

    if (signer && isMultisig(accounts[0])) {
      const multisigTx = getMultisigTx(accounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
    }

    setTransactions(transactions);
    setValidators(validators);
    setActiveStep(Step.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Step.SCANNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const bondValues = new Array(accounts.length).fill(stakeAmount);

  const hints = (
    <HintList className="px-[15px]">
      <HintList.Item>{t('staking.confirmation.hintRewards')}</HintList.Item>
      <HintList.Item>{t('staking.confirmation.hintUnstakePeriod')}</HintList.Item>
      <HintList.Item>{t('staking.confirmation.hintNoRewards')}</HintList.Item>
      <HintList.Item>{t('staking.confirmation.hintRedeem')}</HintList.Item>
    </HintList>
  );

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      <div className="overflow-y-auto">
        {activeStep === Step.INIT && (
          <InitOperation
            api={api}
            chainId={chainId}
            identifiers={accountIds}
            onResult={onInitResult}
            {...explorersProps}
          />
        )}
        {activeStep === Step.VALIDATORS && (
          <Validators api={api} chainId={chainId} onResult={onSelectValidators} {...explorersProps} />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            validators={Object.values(validators)}
            accounts={accounts}
            amounts={bondValues}
            destination={destination}
            transaction={transactions[0]}
            multisigTx={multisigTx}
            onResult={() => setActiveStep(Step.SCANNING)}
            onAddToQueue={noop}
            {...explorersProps}
          >
            {hints}
          </Confirmation>
        )}
        {activeStep === Step.SCANNING &&
          (transactions.length > 1 ? (
            <MultiScanning
              api={api}
              addressPrefix={addressPrefix}
              countdown={countdown}
              accounts={accounts}
              transactions={transactions}
              chainId={chainId}
              onGoBack={() => setActiveStep(Step.SCANNING)}
              onResetCountdown={resetCountdown}
              onResult={onScanResult}
            />
          ) : (
            <Scanning
              api={api}
              addressPrefix={addressPrefix}
              countdown={countdown}
              account={signer || accounts[0]}
              transaction={multisigTx || transactions[0]}
              chainId={chainId}
              onGoBack={() => setActiveStep(Step.CONFIRMATION)}
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
          <Submit
            api={api}
            multisigTx={multisigTx}
            transaction={transactions[0]}
            signatures={signatures}
            unsignedTx={unsignedTransactions}
            validators={Object.values(validators)}
            accounts={accounts}
            amounts={bondValues}
            description={description}
            destination={destination}
            {...explorersProps}
          >
            {hints}
          </Submit>
        )}
      </div>
    </div>
  );
};

export default Bond;
