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
  // const [activeStep, setActiveStep] = useState<Steps>(Steps.PREPARE);
  const [activeStep, setActiveStep] = useState<Steps>(Steps.CHECK);
  const [address, setAddress] = useState('15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7');

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
        {activeStep === 0 && <StepOne onNextStep={() => setActiveStep(Steps.SCAN)} />}
        {activeStep === 1 && <StepTwo onNextStep={onReceiveAddress} />}
        {activeStep === 2 && (
          <StepThree
            ss58Address={address}
            onNextStep={() => setActiveStep(Steps.FINAL)}
            onPrevStep={() => setActiveStep(Steps.SCAN)}
          />
        )}
        {activeStep === 3 && <FinalStep walletType={WalletType.PARITY} />}
      </section>
    </div>
  );
};

export default Parity;
