import Lottie from 'react-lottie';

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

export const Animation = ({ name, width = 80, height = 80, loop = false, autoplay = false, className }: Props) => {
  const defaultOptions = {
    loop,
    autoplay,
    animationData: Animations[name],
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  return (
    <div className={className}>
      <Lottie options={defaultOptions} height={height} width={width} />
    </div>
  );
};
