import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import ConfirmBond from '@renderer/screens/Staking/Bond/ConfirmBond/ConfirmBond';
import InitBond, { BondResult } from '@renderer/screens/Staking/Bond/InitBond/InitBond';
import Validators from '@renderer/screens/Staking/Bond/Validators/Validators';
import { formatAmount } from '@renderer/services/balance/common/utils';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { AccountDS } from '@renderer/services/storage';

const enum Step {
  InitBond,
  Validators,
  ConfirmBond,
}

const HEADER_TITLE: Record<Step, string> = {
  [Step.InitBond]: 'staking.bond.initBondSubtitle',
  [Step.Validators]: 'staking.bond.validatorsSubtitle',
  [Step.ConfirmBond]: 'staking.bond.confirmBondSubtitle',
};

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.InitBond);
  // const [activeStep, setActiveStep] = useState<Step>(Step.Validators);
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<AccountID>('');

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  const goToPrevStep = () => {
    if (activeStep === Step.InitBond) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const onBondResult = (data: BondResult) => {
    if (!asset) return;

    setAccounts(data.accounts);
    setStakeAmount(formatAmount(data.amount, asset.precision));
    setDestination(data.destination);
    setActiveStep(Step.Validators);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    setValidators(validators);
    setActiveStep(Step.ConfirmBond);
  };

  const onConfirmResult = () => {
    // TODO: init bond and nominate call
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-x-2.5 mb-9 mt-5 px-5">
        <ButtonBack onCustomReturn={goToPrevStep} />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t(HEADER_TITLE[activeStep])}</h1>
      </div>

      {asset && activeStep === Step.InitBond && (
        <InitBond api={api} chainId={chainId} accountIds={accountIds} asset={asset} onResult={onBondResult} />
      )}
      {asset && activeStep === Step.Validators && (
        <Validators
          api={api}
          chainId={chainId}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onSelectValidators}
        />
      )}
      {asset && activeStep === Step.ConfirmBond && (
        <ConfirmBond
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

      {!asset && (
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
      )}
    </div>
  );
};

export default Bond;
