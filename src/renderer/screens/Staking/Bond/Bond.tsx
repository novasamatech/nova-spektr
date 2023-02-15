import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import Confirmation from '@renderer/screens/Staking/Bond/Confirmation/Confirmation';
import InitOperation, { BondResult } from '@renderer/screens/Staking/Bond/InitOperation/InitOperation';
import Validators from '@renderer/screens/Staking/Bond/Validators/Validators';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { AccountDS } from '@renderer/services/storage';
import Scanning from './Scanning/Scanning';
import Signing from './Signing/Signing';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SCANNING,
  SIGNING,
}

const HEADER_TITLE: Record<Step, string> = {
  [Step.INIT]: 'staking.bond.initBondSubtitle',
  [Step.VALIDATORS]: 'staking.bond.validatorsSubtitle',
  [Step.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
};

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<AccountID>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const onBondResult = (data: BondResult) => {
    if (!asset) return;

    setAccounts(data.accounts);
    setStakeAmount(data.stake);
    setDestination(data.destination);
    setActiveStep(Step.VALIDATORS);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    setValidators(validators);
    setActiveStep(Step.CONFIRMATION);
  };

  const onConfirmResult = (transactions: Transaction[]) => {
    setTransactions(transactions);
    setActiveStep(Step.SCANNING);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = () => {
    navigate(Paths.STAKING, { replace: true });
  };

  const headerContent = (
    <div className="flex items-center gap-x-2.5 mb-9 mt-5 px-5">
      <ButtonBack onCustomReturn={goToPrevStep} />
      <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
      <p className="font-semibold text-2xl text-neutral">/</p>
      <h1 className="font-semibold text-2xl text-neutral">{t(HEADER_TITLE[activeStep])}</h1>
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

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Step.INIT && (
        <InitOperation api={api} chainId={chainId} accountIds={accountIds} asset={asset} onResult={onBondResult} />
      )}
      {activeStep === Step.VALIDATORS && (
        <Validators
          api={api}
          chainId={chainId}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onSelectValidators}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          chainId={chainId}
          validators={Object.values(validators)}
          accounts={accounts}
          stake={stakeAmount}
          destination={destination}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onConfirmResult}
        />
      )}
      {activeStep === Step.SCANNING && (
        <Scanning
          api={api}
          chainId={chainId}
          accounts={accounts}
          transactions={transactions}
          addressPrefix={addressPrefix}
          onResult={onScanResult}
        />
      )}
      {activeStep === Step.SIGNING && (
        <Signing api={api} unsignedTransactions={unsignedTransactions} onResult={onSignResult} />
      )}
    </div>
  );
};

export default Bond;
