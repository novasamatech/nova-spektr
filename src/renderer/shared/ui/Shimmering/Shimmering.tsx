import { isNumber } from 'lodash';

import { cnTw } from '@shared/lib/utils';

import './Shimmering.css';

type Props = {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
};

export const Shimmering = ({ width, height, circle, className }: Props) => {
  const formattedWidth = isNumber(width) ? `${width}px` : width;
  const formattedHeight = isNumber(height) ? `${height}px` : height;

  return (
    <span
      className={cnTw('h-full w-full block spektr-shimmer', circle ? 'rounded-full' : 'rounded-[10px]', className)}
      style={{ width: formattedWidth, height: circle ? formattedWidth : formattedHeight }}
      data-testid="shimmer"
    />
  );
};
