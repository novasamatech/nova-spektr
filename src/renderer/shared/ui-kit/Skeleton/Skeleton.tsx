import { isNumber, isString } from 'lodash';
import { Children, type PropsWithChildren } from 'react';

import { type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

import './Skeleton.css';

type Props = XOR<
  PropsWithChildren<{
    active: boolean;
    fullWidth?: boolean;
    minWidth?: number | string;
  }>,
  {
    width?: number | string;
    height?: number | string;
    circle?: boolean;
  }
>;

export const Skeleton = ({ width, height, circle, fullWidth, minWidth, active, children }: Props) => {
  const formattedMinWidth = isNumber(minWidth) ? `${gridSpaceConverter(minWidth)}px` : minWidth;
  const formattedWidth = isNumber(width) ? `${gridSpaceConverter(width)}px` : width;
  const formattedHeight = isNumber(height) ? `${gridSpaceConverter(height)}px` : height;

  if (!children) {
    return (
      <span
        className={cnTw(
          'spektr-shimmer block h-full max-h-full w-full max-w-full',
          circle ? 'rounded-full' : 'rounded-2lg',
        )}
        style={{
          width: formattedWidth,
          height: circle ? formattedWidth : formattedHeight,
          minWidth: formattedMinWidth,
        }}
      />
    );
  }

  if (active) {
    return (
      <span
        className={cnTw('spektr-shimmer block h-fit rounded-2lg [&>*]:invisible', {
          'w-full': fullWidth,
          'w-fit': !fullWidth,
        })}
        style={{ minWidth: formattedMinWidth }}
      >
        {Children.map(children, child => (isString(child) ? <span>{child}</span> : child))}
      </span>
    );
  }

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};
