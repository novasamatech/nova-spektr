import { useState } from 'react';

import { Button, Stepper } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18Context';

const ONBOARDING_STEPS = [
  { title: 'Prepare the QR code' },
  { title: 'Scan the QR code' },
  { title: 'Check the result' },
];

const Onboarding = () => {
  const { onLocaleChange } = useI18n();

  const [activeStep, setActiveStep] = useState(0);

  const onLanguageSwitch = async () => {
    try {
      await onLocaleChange('ru');
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <main className="px-9 pt-5 pb-6 flex flex-col h-screen">
      <Stepper steps={ONBOARDING_STEPS} active={activeStep} />
      {/* Content */}
      <div className="flex gap-x-4 mt-auto">
        <Button variant="fill" pallet="primary" onClick={onLanguageSwitch}>
          Switch language
        </Button>
        <Button variant="outline" pallet="primary" onClick={() => setActiveStep((value) => value - 1)}>
          Prev step
        </Button>
        <Button variant="outline" pallet="primary" onClick={() => setActiveStep((value) => value + 1)}>
          Next step
        </Button>
      </div>
    </main>
  );
};

export default Onboarding;
