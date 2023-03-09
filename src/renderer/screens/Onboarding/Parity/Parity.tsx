import { useState } from 'react';

import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { ButtonBack, Stepper } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { SigningType } from '@renderer/domain/shared-kernel';
import FinalStep from '@renderer/screens/Onboarding/FinalStep/FinalStep';
import StepOne from './StepOne/StepOne';
import StepTwo from './StepTwo/StepTwo';
import StepThree from './StepThree/StepThree';
import StepThreeSingle from './StepThreeSingle/StepThreeSingle';

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

  const isPlainQr =
    qrPayload?.length === 1 &&
    ((qrPayload[0].derivedKeys.length === 0 && qrPayload[0].name === '') ||
      qrPayload[0].derivedKeys.every((d) => !d.derivationPath));

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
          <>
            {isPlainQr ? (
              <StepThreeSingle qrData={qrPayload} onNextStep={() => setActiveStep(Step.FINAL)} />
            ) : (
              <StepThree qrData={qrPayload} onNextStep={() => setActiveStep(Step.FINAL)} />
            )}
          </>
        )}
        {activeStep === Step.FINAL && <FinalStep signingType={SigningType.PARITY_SIGNER} />}
      </section>
    </div>
  );
};

export default Parity;
