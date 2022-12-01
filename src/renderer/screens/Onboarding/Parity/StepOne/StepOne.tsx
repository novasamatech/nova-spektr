import { ReactNode } from 'react';
import type { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';

import SlideOne from '@images/misc/onboarding/slide-1.svg';
import SlideTwo from '@images/misc/onboarding/slide-2.svg';
import SlideThree from '@images/misc/onboarding/slide-3.svg';
import { Button, Carousel, Icon } from '@renderer/components/ui';
import { SlideNode } from '@renderer/components/ui/Carousel/Carousel';
import { useI18n } from '@renderer/context/I18nContext';

const createNode = (src: string, alt: string, header: ReactNode) => (
  <>
    <img src={src} alt={alt} width={500} height={384} />
    <div className="flex items-center justify-center h-15 px-5">
      <h2 className="text-neutral-variant text-center">{header}</h2>
    </div>
  </>
);

const getCarouselSlider = (t: TFunction): SlideNode[] => [
  {
    id: '1',
    node: createNode(
      SlideOne,
      t('onboarding.paritySigner.sliderLabel1'),
      <Trans t={t} i18nKey="onboarding.paritySigner.sliderLabel1" />,
    ),
  },
  {
    id: '2',
    node: createNode(
      SlideTwo,
      t('onboarding.paritySigner.sliderLabel2'),
      <Trans t={t} i18nKey="onboarding.paritySigner.sliderLabel2" />,
    ),
  },
  {
    id: '3',
    node: createNode(
      SlideThree,
      t('onboarding.paritySigner.sliderLabel3'),
      <Trans t={t} i18nKey="onboarding.paritySigner.sliderLabel3" />,
    ),
  },
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
          <Icon className="absolute text-shade-10" name="qrSimple" size={70} />
          <Icon className="absolute text-shade-10" name="qrFrame" size={250} />
        </div>
        <Button className="w-max" weight="lg" variant="fill" pallet="primary" onClick={onNextStep}>
          {t('onboarding.paritySigner.scanQRFromParitySignerButton')}
        </Button>
      </div>
    </div>
  );
};

export default StepOne;
