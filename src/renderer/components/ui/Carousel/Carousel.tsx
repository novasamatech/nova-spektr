import cn from 'classnames';
import { ReactNode, useState } from 'react';
import { EffectFade, Autoplay } from 'swiper';
import { Swiper as SwiperRoot, SwiperSlide } from 'swiper/react';
import { AutoplayOptions, Swiper } from 'swiper/types';
import 'swiper/css';
import 'swiper/css/effect-fade';

import { Icon } from '@renderer/components/ui';

type Props = {
  animationDuration?: number;
  loop?: boolean;
  autoplay?: boolean | AutoplayOptions;
  slides: ReactNode[];
};

const Carousel = ({ loop, autoplay, animationDuration = 300, slides }: Props) => {
  const [swiper, setSwiper] = useState<Swiper>();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <SwiperRoot
      loop={loop}
      autoplay={autoplay}
      effect="fade"
      speed={animationDuration}
      fadeEffect={{ crossFade: true }}
      modules={[Autoplay, EffectFade]}
      onBeforeInit={setSwiper}
      onActiveIndexChange={(swiper) => setActiveIndex(swiper.realIndex)}
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={index} tag="div">
          {slide}
        </SwiperSlide>
      ))}

      <div className="flex justify-center items-center gap-x-12 py-4">
        <button
          type="button"
          className="text-shade-30 hover:text-shade-50 focus:text-shade-50"
          onClick={() => swiper?.slidePrev()}
        >
          <Icon as="svg" name="left" />
        </button>
        <div className="flex gap-x-2.5">
          {slides.map((slide, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                'border-2 rounded-full w-4 h-4',
                index === activeIndex ? 'bg-primary border-primary' : 'border-shade-30',
              )}
              onClick={() => swiper?.slideToLoop(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="text-shade-30 hover:text-shade-50 focus:text-shade-50"
          onClick={() => swiper?.slideNext()}
        >
          <Icon as="svg" name="right" />
        </button>
      </div>
    </SwiperRoot>
  );
};

export default Carousel;
