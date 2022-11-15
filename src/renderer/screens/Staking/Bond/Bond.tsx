import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import Paths from '@renderer/routes/paths';
import { ButtonBack } from '@renderer/components/ui';
import ConfirmBond from '@renderer/screens/Staking/Bond/ConfirmBond/ConfirmBond';
import InitBond from '@renderer/screens/Staking/Bond/InitBond/InitBond';
import Validators from '@renderer/screens/Staking/Bond/Validators/Validators';

const enum Step {
  InitBond,
  Validators,
  ConfirmBond,
}

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState<Step>(Step.InitBond);

  const goToPrevStep = () => {
    if (activeStep === Step.InitBond) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack onCustomReturn={goToPrevStep} />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('staking.bond.initBondSubtitle')}</h1>
      </div>

      {activeStep === Step.InitBond && <InitBond />}
      {activeStep === Step.Validators && <Validators />}
      {activeStep === Step.ConfirmBond && <ConfirmBond />}
    </div>
  );
};

export default Bond;
