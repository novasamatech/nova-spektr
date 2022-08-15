import { useState } from 'react';

import { ButtonBack, Stepper } from '@renderer/components/ui';

const PARITY_FLOW_STEPS: Record<'title', string>[] = [
  { title: 'Prepare the QR code' },
  { title: 'Scan the QR code' },
  { title: 'Check the result' },
];

const Parity = () => {
  const [activeStep] = useState(0);

  return (
    <>
      <div className="flex items-center gap-x-2.5">
        <ButtonBack />
        <h1 className="text-neutral">Add wallet by Parity Signer</h1>
      </div>
      <Stepper steps={PARITY_FLOW_STEPS} active={activeStep} />
    </>
  );
};

export default Parity;
