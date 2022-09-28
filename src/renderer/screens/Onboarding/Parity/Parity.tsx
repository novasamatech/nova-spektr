import { useState } from 'react';

import { ButtonBack, Stepper } from '@renderer/components/ui';
import StepOne from './StepOne/StepOne';
import StepTwo from './StepTwo/StepTwo';
import StepThree from './StepThree/StepThree';
import FinalStep from '@renderer/screens/Onboarding/FinalStep/FinalStep';
import { WalletType } from '@renderer/domain/wallet';
import { useI18n } from '@renderer/context/I18nContext';

const enum Step {
  PREPARE,
  SCAN,
  CHECK,
  FINAL,
}

const Parity = () => {
  const { t } = useI18n();

  const [activeStep, setActiveStep] = useState<Step>(Step.PREPARE);
  const [address, setAddress] = useState('');

  const onReceiveAddress = (value: string) => {
    setAddress(value);
    setActiveStep(Step.CHECK);
  };

  const parityFlowSteps: Record<'title', string>[] = [
    { title: t('onboarding.paritysigner.step0') },
    { title: t('onboarding.paritysigner.step1') },
    { title: t('onboarding.paritysigner.step2') },
  ];

  return (
    <div className="flex flex-col h-full">
      {activeStep !== Step.FINAL && (
        <div className="flex items-center gap-x-2.5">
          <ButtonBack />
          <h1 className="text-neutral">{t('onboarding.paritysigner.addByParitySignerLabel')}</h1>
        </div>
      )}
      <section className="flex flex-col gap-y-16 h-max max-w-[1000px] w-full m-auto">
        <Stepper steps={parityFlowSteps} active={activeStep} />
        {activeStep === Step.PREPARE && <StepOne onNextStep={() => setActiveStep(Step.SCAN)} />}
        {activeStep === Step.SCAN && <StepTwo onNextStep={onReceiveAddress} />}
        {activeStep === Step.CHECK && (
          <StepThree
            ss58Address={address}
            onNextStep={() => setActiveStep(Step.FINAL)}
            onPrevStep={() => setActiveStep(Step.SCAN)}
          />
        )}
        {activeStep === Step.FINAL && <FinalStep walletType={WalletType.PARITY} />}
      </section>
    </div>
  );
};

export default Parity;
