import { isNumber } from 'lodash';
import { type PropsWithChildren } from 'react';

import { type XOR } from '@/shared/core';
import { cnTw } from '@shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

import './Skeleton.css';

type Props = XOR<
  PropsWithChildren<{
    active: boolean;
    fullWidth?: boolean;
  }>,
  {
    width?: number | string;
    height?: number | string;
    circle?: boolean;
  }
>;

export const Skeleton = ({ width, height, circle, fullWidth, active, children }: Props) => {
  const formattedWidth = isNumber(width) ? `${gridSpaceConverter(width)}px` : width;
  const formattedHeight = isNumber(height) ? `${gridSpaceConverter(height)}px` : height;

  if (children) {
    if (!active) {
      // eslint-disable-next-line react/jsx-no-useless-fragment
      return <>{children}</>;
    }

    return (
      <span
        className={cnTw('spektr-shimmer block h-fit rounded-2lg [&>*]:invisible', {
          'w-full': fullWidth,
          'w-fit': !fullWidth,
        })}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cnTw('spektr-shimmer block h-full w-full', circle ? 'rounded-full' : 'rounded-2lg')}
      style={{ width: formattedWidth, height: circle ? formattedWidth : formattedHeight }}
      data-testid="shimmer"
    />
  );
};