import { useState } from 'react';

import { ButtonBack, Stepper } from '@renderer/components/ui';
import StepOne from './StepOne/StepOne';
import StepTwo from './StepTwo/StepTwo';
import StepThree from './StepThree/StepThree';
import FinalStep from '@renderer/screens/Onboarding/FinalStep/FinalStep';
import { WalletType } from '@renderer/domain/wallet';
import { useI18n } from '@renderer/context/I18nContext';

const PARITY_FLOW_STEPS: Record<'title', string>[] = [
  { title: 'Prepare the QR code' },
  { title: 'Scan the QR code' },
  { title: 'Check the result' },
];

const enum Step {
  PREPARE,
  SCAN,
  CHECK,
  FINAL,
}

const Parity = () => {
  const [activeStep, setActiveStep] = useState<Step>(Step.PREPARE);
  const [address, setAddress] = useState('');
  const { t } = useI18n();

  const onReceiveAddress = (value: string) => {
    setAddress(value);
    setActiveStep(Step.CHECK);
  };

  return (
    <div className="flex flex-col h-full">
      {activeStep !== Step.FINAL && (
        <div className="flex items-center gap-x-2.5">
          <ButtonBack />
          <h1 className="text-neutral">{t('onboarding.paritysigner.addByParitySignerLabel')}</h1>
        </div>
      )}
      <section className="flex flex-col gap-y-16 h-max max-w-[1000px] w-full m-auto">
        <Stepper steps={PARITY_FLOW_STEPS} active={activeStep} />
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
