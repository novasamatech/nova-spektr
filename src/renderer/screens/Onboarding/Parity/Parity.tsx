import { useState } from 'react';

import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { ButtonBack, Stepper } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { WalletType } from '@renderer/domain/wallet';
import FinalStep from '@renderer/screens/Onboarding/FinalStep/FinalStep';
import StepOne from './StepOne/StepOne';
import StepThree from './StepThree/StepThree';
import StepTwo from './StepTwo/StepTwo';

const enum Step {
  PREPARE,
  SCAN,
  CHECK,
  FINAL,
}

const Parity = () => {
  const { t } = useI18n();

  const [activeStep, setActiveStep] = useState<Step>(Step.PREPARE);
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>();

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep(Step.CHECK);
  };

  const parityFlowSteps: Record<'title', string>[] = [
    { title: t('onboarding.paritySigner.step0') },
    { title: t('onboarding.paritySigner.step1') },
    { title: t('onboarding.paritySigner.step2') },
  ];

  return (
    <div className="flex flex-col h-full">
      {activeStep !== Step.FINAL && (
        <div className="flex items-center gap-x-2.5">
          <ButtonBack />
          <h1 className="text-neutral">{t('onboarding.paritySigner.addByParitySignerLabel')}</h1>
        </div>
      )}
      <section className="flex flex-col gap-y-16 h-max max-w-[1000px] w-full m-auto">
        <Stepper steps={parityFlowSteps} active={activeStep} />
        {activeStep === Step.PREPARE && <StepOne onNextStep={() => setActiveStep(Step.SCAN)} />}
        {activeStep === Step.SCAN && <StepTwo onNextStep={onReceiveQr} />}
        {activeStep === Step.CHECK && qrPayload && (
          <StepThree
            qrData={qrPayload}
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
