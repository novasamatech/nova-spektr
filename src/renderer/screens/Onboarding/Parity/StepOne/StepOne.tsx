import { ReactNode } from 'react';

import { Button, Carousel, Icon } from '@renderer/components/ui';
import SlideOne from '@images/misc/onboarding/slide-1.svg';
import SlideTwo from '@images/misc/onboarding/slide-2.svg';
import SlideThree from '@images/misc/onboarding/slide-3.svg';
import { useI18n } from '@renderer/context/I18nContext';

const CAROUSEL_SLIDES: ReactNode[] = [
  <>
    <img src={SlideOne} alt="Parity Signer application is being opened on your smartphone" width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        Open the <span className="font-bold">Parity Signer</span> application on your smartphone
      </h2>
    </div>
  </>,
  <>
    <img src={SlideTwo} alt="'Keys' tab is opened with appropriate account" width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        Go to “<span className="font-bold">Keys</span>” tab. Select <span className="font-bold">seed</span>, then
        account
        <br />
        you would like to add to Omni
      </h2>
    </div>
  </>,
  <>
    <img src={SlideThree} alt="Parity Signer built-in QR code" width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        Parity Signer will provide you a <span className="font-bold">QR code</span> for scanning
      </h2>
    </div>
  </>,
];

type Props = {
  onNextStep: () => void;
};

const StepOne = ({ onNextStep }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex">
      <div className="flex-1">
        <div className="w-[500px] h-[500px]">
          <Carousel
            loop
            slides={CAROUSEL_SLIDES}
            animationDuration={500}
            autoplay={{
              delay: 3000,
              pauseOnMouseEnter: true,
              disableOnInteraction: false,
            }}
          />
        </div>
      </div>
      <div className="relative flex flex-col justify-center items-center flex-1 py-5 shadow-surface rounded-2lg bg-white overflow-hidden">
        <div className="flex items-center justify-center bg-white w-full h-full">
          <Icon className="absolute text-shade-10" as="svg" name="qrSimple" size={66} />
          <Icon className="absolute text-shade-10" as="svg" name="qrFrame" size={320} />
        </div>

        <Button className="absolute w-max bottom-5" weight="lg" variant="fill" pallet="primary" onClick={onNextStep}>
          {t('onboarding.scanQRFromParitySignerButton')}
        </Button>
      </div>
    </div>
  );
};

export default StepOne;
