import { Suspense, lazy, memo, useEffect, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Shimmering } from '../Shimmering/Shimmering';

type Props = {
  variant: 'error' | 'success' | 'loading';
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

const LazyAnimation = lazy(async () => {
  const [{ default: error }, { default: loading }, { default: success }] = await Promise.all([
    import('@shared/assets/animations/alert.json'),
    import('@shared/assets/animations/spinner.json'),
    import('@shared/assets/animations/success.json'),
  ]);

  const images: Record<Props['variant'], unknown> = {
    error,
    success,
    loading,
  };

  const { useLottie } = await import('lottie-react');

  const Component = ({ variant, width, height, loop, autoplay, className }: Props) => {
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
      setAnimation(JSON.parse(JSON.stringify(images[variant])));
    }, [variant]);

    return <div className={cnTw(className, 'animate-in fade-in [&>*]:contain-strict')}>{View}</div>;
  };

  return { default: Component };
});

export const Animation = memo<Props>(
  ({ variant, width = 80, height = 80, loop = false, autoplay = true, className }) => {
    const fallback = <Shimmering width={width} height={height} circle={width === height} />;

    return (
      <Suspense fallback={fallback}>
        <LazyAnimation
          className={className}
          variant={variant}
          width={width}
          height={height}
          loop={loop}
          autoplay={autoplay}
        />
      </Suspense>
    );
  },
);
