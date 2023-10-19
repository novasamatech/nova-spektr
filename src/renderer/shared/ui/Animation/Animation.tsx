import { useEffect, useState } from 'react';
import { useLottie } from 'lottie-react';

import Animations from './Data';

export type AnimationNames = keyof typeof Animations;

export type Props = {
  variant: AnimationNames;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

export const Animation = ({ variant, width = 80, height = 80, loop = false, autoplay = true, className }: Props) => {
  const [animation, setAnimation] = useState();

  const defaultOptions = {
    loop,
    autoplay,
    animationData: animation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  const { View } = useLottie(defaultOptions, { width: width, height: height });

  useEffect(() => {
    // using same animation repeatedly without deep clone lead to memory leak
    // https://github.com/airbnb/lottie-web/issues/1159
    setAnimation(JSON.parse(JSON.stringify(Animations[variant])));
  }, [variant]);

  return <div className={className}>{View}</div>;
};
