import { useState } from 'react';

import { ButtonReturn, Stepper } from '@renderer/components/ui';

const PARITY_FLOW_STEPS: Record<'title', string>[] = [
  { title: 'Prepare the QR code' },
  { title: 'Scan the QR code' },
  { title: 'Check the result' },
];

type Props = {
  onNextStep?: () => void;
};

const Parity = ({ onNextStep }: Props) => {
  // @ts-ignore
  const [activeStep, setActiveStep] = useState(0);

  return (
    <>
      <div className="flex items-center gap-x-2.5">
        <ButtonReturn />
        <h1 className="text-neutral">Add wallet by Parity Signer</h1>
      </div>
      <Stepper steps={PARITY_FLOW_STEPS} active={activeStep} />
    </>
  );
};

export default Parity;
