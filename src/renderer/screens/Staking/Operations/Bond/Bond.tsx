import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { formatAddress } from '@renderer/shared/utils/address';
import { RewardsDestination } from '@renderer/domain/stake';
import { ButtonBack, ButtonLink, HintList, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import InitOperation, { BondResult } from './InitOperation/InitOperation';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { AccountDS } from '@renderer/services/storage';
import { Validators, Confirmation, Scanning, Signing, Submit, ChainLoader } from '../components';
import { useCountdown } from '../hooks/useCountdown';

const enum Steps {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

type Destination = {
  address?: AccountID;
  type: RewardsDestination;
};

const HeaderTitles: Record<Steps, string> = {
  [Steps.INIT]: 'staking.bond.initBondSubtitle',
  [Steps.VALIDATORS]: 'staking.bond.validatorsSubtitle',
  [Steps.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Steps.SCANNING]: 'staking.bond.scanSubtitle',
  [Steps.SIGNING]: 'staking.bond.signSubtitle',
  [Steps.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getChainById } = useChains();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Steps>(Steps.INIT);
  const [chainName, setChainName] = useState('...');
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<Destination>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);
  const [countdown, resetCountdown] = useCountdown(api);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const goToPrevStep = () => {
    if (activeStep === Steps.INIT) {
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

  const onInitResult = ({ accounts, destination, stake }: BondResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    setDestination(destPayload);
    setAccounts(accounts);
    setStakeAmount(stake);
    setActiveStep(Steps.VALIDATORS);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = accounts.map(({ accountId = '' }) => {
      const address = formatAddress(accountId, addressPrefix);
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
        args: { targets: Object.keys(validators).map((address) => address) },
      };

      return {
        ...commonPayload,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(transactions);
    setValidators(validators);
    setActiveStep(Steps.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Steps.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Steps.SCANNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Steps.SUBMIT);
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

      {activeStep === Steps.INIT && (
        <InitOperation api={api} chainId={chainId} accountIds={accountIds} asset={asset} onResult={onInitResult} />
      )}
      {activeStep === Steps.VALIDATORS && (
        <Validators api={api} chainId={chainId} onResult={onSelectValidators} {...explorersProps} />
      )}
      {activeStep === Steps.CONFIRMATION && (
        <Confirmation
          api={api}
          validators={Object.values(validators)}
          accounts={accounts}
          amounts={bondValues}
          destination={destination}
          transaction={transactions[0]}
          onResult={() => setActiveStep(Steps.SCANNING)}
          onAddToQueue={noop}
          {...explorersProps}
        >
          {hints}
        </Confirmation>
      )}
      {activeStep === Steps.SCANNING && (
        <Scanning
          api={api}
          chainId={chainId}
          accounts={accounts}
          transactions={transactions}
          addressPrefix={addressPrefix}
          countdown={countdown}
          onResetCountdown={resetCountdown}
          onResult={onScanResult}
        />
      )}
      {activeStep === Steps.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={onBackToScan}
        />
      )}
      {activeStep === Steps.SUBMIT && (
        <Submit
          api={api}
          transaction={transactions[0]}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          validators={Object.values(validators)}
          accounts={accounts}
          amounts={bondValues}
          destination={destination}
          {...explorersProps}
        >
          {hints}
        </Submit>
      )}
    </div>
  );
};

export default Bond;
