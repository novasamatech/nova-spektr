import { isNumber } from 'lodash';

import { cnTw } from '@/shared/lib/utils';

import './Shimmering.css';

type Props = {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
  testId?: string;
};

/**
 * @deprecated Use `import { Skeleton } from '@/shared/ui-kit'` instead.
 */
export const Shimmering = ({ width, height, circle, className, testId = 'shimmer' }: Props) => {
  const formattedWidth = isNumber(width) ? `${width}px` : width;
  const formattedHeight = isNumber(height) ? `${height}px` : height;

  return (
    <span
      className={cnTw('spektr-shimmer block h-full w-full', circle ? 'rounded-full' : 'rounded-[10px]', className)}
      style={{ width: formattedWidth, height: circle ? formattedWidth : formattedHeight }}
      data-testid={testId}
    />
  );
};
