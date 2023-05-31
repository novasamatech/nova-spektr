import { ReactNode, useState } from 'react';
import { EffectFade, Autoplay } from 'swiper';
import { Swiper as SwiperRoot, SwiperSlide } from 'swiper/react';
import { AutoplayOptions, Swiper } from 'swiper/types';
import 'swiper/css';
import 'swiper/css/effect-fade';

import { Icon } from '@renderer/components/ui';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  animationDuration?: number;
  loop?: boolean;
  autoplay?: boolean | AutoplayOptions;
  slides: SlideNode[];
};

export type SlideNode = {
  id: string | number;
  node: ReactNode;
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
      {slides.map((slide) => (
        <SwiperSlide key={slide.id} tag="div">
          {slide.node}
        </SwiperSlide>
      ))}

      <div className="flex justify-center items-center gap-x-12 py-4">
        <button
          type="button"
          className="text-shade-30 hover:text-shade-50 focus:text-shade-50"
          onClick={() => swiper?.slidePrev()}
        >
          <Icon name="left" />
        </button>
        <div className="flex gap-x-2.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={cnTw(
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
          <Icon name="right" />
        </button>
      </div>
    </SwiperRoot>
  );
};

export default Carousel;
