import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ButtonBack } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import ConfirmBond from '@renderer/screens/Staking/Bond/ConfirmBond/ConfirmBond';
import InitBond from '@renderer/screens/Staking/Bond/InitBond/InitBond';
import Validators from '@renderer/screens/Staking/Bond/Validators/Validators';
import { Validator } from '@renderer/domain/validator';

const enum Step {
  InitBond,
  Validators,
  ConfirmBond,
}

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { chainId } = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.Validators);
  const [_, setValidators] = useState<Validator[]>([]);

  const api = chainId && connections[chainId]?.api;
  const asset = chainId && connections[chainId]?.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  const goToPrevStep = () => {
    if (activeStep === Step.InitBond) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const onBondResult = () => {
    // TODO: save bond value and selected wallets
    console.log(123);
  };

  const onSelectValidators = (validators: Validator[]) => {
    setValidators(validators);
    setActiveStep(Step.ConfirmBond);
  };

  const onConfirmResult = () => {
    // TODO: init bond and nominate call
    console.log(123);
  };

  const headerTitle: Record<Step, string> = {
    [Step.InitBond]: t('staking.bond.initBondSubtitle'),
    [Step.Validators]: t('staking.bond.validatorsSubtitle'),
    [Step.ConfirmBond]: t('staking.bond.confirmBondSubtitle'),
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack onCustomReturn={goToPrevStep} />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{headerTitle[activeStep]}</h1>
      </div>

      {activeStep === Step.InitBond && <InitBond api={api} chainId={chainId} onResult={onBondResult} />}
      {activeStep === Step.Validators && (
        <Validators api={api} chainId={chainId} asset={asset} onResult={onSelectValidators} />
      )}
      {activeStep === Step.ConfirmBond && <ConfirmBond api={api} chainId={chainId} onResult={onConfirmResult} />}
    </div>
  );
};

export default Bond;
