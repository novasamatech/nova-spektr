import { ReactNode } from 'react';
import { Trans } from 'react-i18next';
import type { TFunction } from 'react-i18next';

import { Button, Carousel, Icon } from '@renderer/components/ui';
import SlideOne from '@images/misc/onboarding/slide-1.svg';
import SlideTwo from '@images/misc/onboarding/slide-2.svg';
import SlideThree from '@images/misc/onboarding/slide-3.svg';
import { useI18n } from '@renderer/context/I18nContext';

const getCarouselSlider = (t: TFunction): ReactNode[] => [
  <>
    <img src={SlideOne} alt="Parity Signer application is being opened on your smartphone" width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        <Trans t={t} i18nKey="onboarding.paritysigner.sliderLabel1" />
      </h2>
    </div>
  </>,
  <>
    <img src={SlideTwo} alt="'Keys' tab is opened with appropriate account" width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        <Trans t={t} i18nKey="onboarding.paritysigner.sliderLabel2" />
      </h2>
    </div>
  </>,
  <>
    <img src={SlideThree} alt="Parity Signer built-in QR code" width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">
        <Trans t={t} i18nKey="onboarding.paritysigner.sliderLabel3" />
      </h2>
    </div>
  </>,
];

const AUTOPLAY_CONFIG = {
  delay: 3000,
  pauseOnMouseEnter: true,
  disableOnInteraction: false,
};

type Props = {
  onNextStep: () => void;
};

const StepOne = ({ onNextStep }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex rounded-2lg bg-shade-2">
      <div className="flex-1">
        <div className="w-[500px] h-[500px]">
          <Carousel loop slides={getCarouselSlider(t)} animationDuration={500} autoplay={AUTOPLAY_CONFIG} />
        </div>
      </div>
      <div className="flex flex-col justify-center items-center flex-1 py-5 shadow-surface rounded-2lg bg-white overflow-hidden">
        <div className="relative flex items-center justify-center bg-white w-full h-full">
          <Icon className="absolute text-shade-10" as="svg" name="qrSimple" size={70} />
          <Icon className="absolute text-shade-10" as="svg" name="qrFrame" size={250} />
        </div>
        <Button className="w-max" weight="lg" variant="fill" pallet="primary" onClick={onNextStep}>
          {t('onboarding.paritysigner.scanQRFromParitySignerButton')}
        </Button>
      </div>
    </div>
  );
};

export default StepOne;
