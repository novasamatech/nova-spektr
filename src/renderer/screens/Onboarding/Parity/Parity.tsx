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

const enum Steps {
  PREPARE,
  SCAN,
  CHECK,
  FINAL,
}

const Parity = () => {
  const { t } = useI18n();

  const [activeStep, setActiveStep] = useState<Steps>(Steps.PREPARE);
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>();

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep(Steps.CHECK);
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
      {activeStep !== Steps.FINAL && (
        <div className="flex items-center gap-x-2.5">
          <ButtonBack>
            <h1 className="text-neutral">{t('onboarding.paritySigner.addByParitySignerLabel')}</h1>
          </ButtonBack>
        </div>
      )}
      <section className="flex flex-col gap-y-16 h-max max-w-[1000px] w-full m-auto">
        <Stepper steps={parityFlowSteps} active={activeStep} />
        {activeStep === Steps.PREPARE && <StepOne onNextStep={() => setActiveStep(Steps.SCAN)} />}
        {activeStep === Steps.SCAN && <StepTwo onNextStep={onReceiveQr} />}
        {activeStep === Steps.CHECK && qrPayload && (
          <>
            {isPlainQr ? (
              <StepThreeSingle qrData={qrPayload} onNextStep={() => setActiveStep(Steps.FINAL)} />
            ) : (
              <StepThree qrData={qrPayload} onNextStep={() => setActiveStep(Steps.FINAL)} />
            )}
          </>
        )}
        {activeStep === Steps.FINAL && <FinalStep signingType={SigningType.PARITY_SIGNER} />}
      </section>
    </div>
  );
};

export default Parity;
