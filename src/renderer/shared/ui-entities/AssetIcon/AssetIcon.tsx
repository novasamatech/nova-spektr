import { memo, useState } from 'react';

import { type Asset } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Skeleton, useTheme } from '@/shared/ui-kit';

type Props = {
  asset: Pick<Asset, 'name' | 'icon'>;
  size?: number;
  style?: 'monochrome' | 'colored';
};

const loaded: Set<string> = new Set();

export const AssetIcon = memo(({ asset, style, size = 36 }: Props) => {
  const { iconStyle } = useTheme();

  const computedStyle = style || iconStyle;
  const iconSrc = asset.icon[computedStyle];
  const iconSize = computedStyle === 'monochrome' ? size - 4 : size;

  const [isImgLoaded, setImgLoaded] = useState(() => loaded.has(iconSrc));

  return (
    <div
      className={cnTw('relative h-fit w-fit min-w-fit rounded-full', {
        'border border-token-border bg-token-background p-px': computedStyle === 'monochrome',
      })}
    >
      {!isImgLoaded && <Skeleton circle width={iconSize / 4} height={iconSize / 4} />}

      <img
        src={iconSrc}
        className={cnTw('transition-opacity duration-75 select-none', !isImgLoaded && 'hidden')}
        // using width and height attr doesn't work properly for invisible img. It gets reset by tailwind @base styles
        style={{ width: iconSize, height: iconSize }}
        alt={asset.name}
        onLoad={e => {
          loaded.add(e.currentTarget.src);
          setImgLoaded(true);
        }}
      />
    </div>
  );
});
