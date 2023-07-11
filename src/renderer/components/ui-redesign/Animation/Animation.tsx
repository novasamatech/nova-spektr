import { useLottie } from 'lottie-react';

import Animations from './Data';

export type AnimationNames = keyof typeof Animations;

export type Props = {
  name: AnimationNames;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

export const Animation = ({ name, width = 80, height = 80, loop = false, autoplay = true, className }: Props) => {
  const defaultOptions = {
    loop,
    autoplay,
    animationData: Animations[name],
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  const { View } = useLottie(defaultOptions, { width: width, height: height });

  return <div className={className}>{View}</div>;
};
