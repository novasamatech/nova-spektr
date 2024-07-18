import { useLottie } from 'lottie-react';
import { useEffect, useState } from 'react';

import { Images } from './common/constants';

type Props = {
  variant: keyof typeof Images;
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

  const { View } = useLottie(defaultOptions, { width, height });

  useEffect(() => {
    // HINT: using same animation repeatedly without deep clone leads to memory leak
    // https://github.com/airbnb/lottie-web/issues/1159
    setAnimation(JSON.parse(JSON.stringify(Images[variant])));
  }, [variant]);

  return <div className={className}>{View}</div>;
};
