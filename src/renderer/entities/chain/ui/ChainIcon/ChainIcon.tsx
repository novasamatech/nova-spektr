import { memo, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

/**
 * @deprecated Use import { ChainIcon } from '@/shared/ui-entities' instead
 */
export const ChainIcon = memo(({ src, name, size = 16, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useState(false);

  return (
    <Skeleton active={!isImgLoaded}>
      <img
        src={src}
        className={cnTw('pointer-events-none h-full select-none', className)}
        width={size}
        height={size}
        alt={name}
        onLoad={() => toggleImgLoaded(true)}
      />
    </Skeleton>
  );
});
