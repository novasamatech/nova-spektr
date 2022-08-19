import { useState } from 'react';

import { ButtonBack, Stepper } from '@renderer/components/ui';
import StepOne from './StepOne/StepOne';
import StepTwo from './StepTwo/StepTwo';
import StepThree from './StepThree/StepThree';
import FinalStep from '@renderer/screens/Onboarding/FinalStep/FinalStep';
import { WalletType } from '@renderer/domain/wallet';

const PARITY_FLOW_STEPS: Record<'title', string>[] = [
  { title: 'Prepare the QR code' },
  { title: 'Scan the QR code' },
  { title: 'Check the result' },
];

const enum Steps {
  PREPARE,
  SCAN,
  CHECK,
  FINAL,
}

const Parity = () => {
  const [activeStep, setActiveStep] = useState<Steps>(Steps.PREPARE);
  const [address, setAddress] = useState('');

  const onReceiveAddress = (value: string) => {
    setAddress(value);
    setActiveStep(Steps.CHECK);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-x-2.5">
        <ButtonBack />
        <h1 className="text-neutral">Add wallet by Parity Signer</h1>
      </div>
      <section className="flex flex-col gap-y-16 h-max max-w-[1000px] w-full m-auto">
        <Stepper steps={PARITY_FLOW_STEPS} active={activeStep} />
        {activeStep === Steps.PREPARE && <StepOne onNextStep={() => setActiveStep(Steps.SCAN)} />}
        {activeStep === Steps.SCAN && <StepTwo onNextStep={onReceiveAddress} />}
        {activeStep === Steps.CHECK && (
          <StepThree ss58Address={address} onNextStep={() => setActiveStep(Steps.FINAL)} />
        )}
        {activeStep === Steps.FINAL && <FinalStep walletType={WalletType.PARITY} />}
      </section>
    </div>
  );
};

export default Parity;
