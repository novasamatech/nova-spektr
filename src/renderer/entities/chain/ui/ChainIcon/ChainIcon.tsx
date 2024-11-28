import { memo } from 'react';

import { useToggle } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { Shimmering } from '@/shared/ui';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

export const ChainIcon = memo(({ src, name, size = 16, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useToggle();

  return (
    <>
      {!isImgLoaded && <Shimmering width={size} height={size} className={cnTw('rounded', className)} />}
      <img
        src={src}
        className={cnTw('pointer-events-none inline-block select-none', !isImgLoaded && 'hidden', className)}
        width={size}
        height={size}
        alt={name}
        onLoad={toggleImgLoaded}
      />
    </>
  );
});
