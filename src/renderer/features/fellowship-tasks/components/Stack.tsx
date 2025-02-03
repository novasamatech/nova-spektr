import { animated, useTransition } from '@react-spring/web';
import { type ReactNode } from 'react';

import { Surface, defaultEasing } from '@/shared/ui-kit';

type Props = {
  active: number;
  cards: { node: ReactNode }[];
};

const animationConfig = {
  initial: {
    opacity: 1,
    transformOrigin: 'bottom left',
    transform: `translateX(0%) scale(1) rotate(0deg)`,
  },
  from: {
    opacity: 0,
    transformOrigin: 'bottom right',
    transform: `translateX(20%) scale(0.95) rotate(5deg)`,
  },
  enter: {
    opacity: 1,
    transformOrigin: 'bottom right',
    transform: `translateX(0%) scale(1) rotate(0deg)`,
  },
  leave: {
    position: 'absolute',
    opacity: 0.0,
    transformOrigin: 'bottom left',
    transform: `translateX(-20%) scale(0.95) rotate(-5deg)`,
  },
  config: {
    duration: 500,
    easing: defaultEasing,
  },
};

export const Stack = ({ active, cards }: Props) => {
  const transitions = useTransition(active, animationConfig);

  return (
    <div className="relative h-full w-full">
      {transitions((style, index) => {
        const card = cards[index % cards.length];
        if (!card) return null;

        return (
          <animated.div style={style} className="inset-0 h-full w-full">
            <Surface elevation={1} className="h-full w-full rounded-xl">
              {card.node}
            </Surface>
          </animated.div>
        );
      })}
    </div>
  );
};
