import { useLottie } from 'lottie-react';

import Animations from './Data';

export type AnimationNames = keyof typeof Animations;

export type Props = {
  animation: Object;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

export const Animation = ({ animation, width = 80, height = 80, loop = false, autoplay = true, className }: Props) => {
  const defaultOptions = {
    loop,
    autoplay,
    animationData: animation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  const { View } = useLottie(defaultOptions, { width: width, height: height });

  return <div className={className}>{View}</div>;
};
