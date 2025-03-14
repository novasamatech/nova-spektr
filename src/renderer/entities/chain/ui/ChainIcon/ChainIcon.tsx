import { memo, useLayoutEffect, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

export const ChainIcon = memo(({ src, name, size = 16, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useState(false);
  const [ref, setRef] = useState<HTMLImageElement | null>(null);

  useLayoutEffect(() => {
    if (ref && ref.naturalWidth > 0) {
      toggleImgLoaded(true);
    }
  }, [ref]);

  return (
    <Skeleton active={!isImgLoaded}>
      <img
        ref={setRef}
        src={src}
        className={cnTw('pointer-events-none select-none', className)}
        width={size}
        height={size}
        alt={name}
        onLoad={() => toggleImgLoaded(true)}
      />
    </Skeleton>
  );
});
