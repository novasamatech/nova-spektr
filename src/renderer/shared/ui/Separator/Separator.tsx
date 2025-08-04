import './Separator.css';

import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '../Typography';

type Props = PropsWithChildren<{
  className?: string;
  vertical?: boolean;
}>;

export const Separator = ({ className, vertical, children }: Props) => {
  if (vertical) {
    return (
      <div className={cnTw('spektr-vertical-separator flex items-center border-divider', className)}>
        {children ? (
          <CaptionText className="my-4 text-text-tertiary uppercase" align="center">
            {children}
          </CaptionText>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cnTw('spektr-separator flex w-full items-center border-divider', className)}>
      {children ? (
        <CaptionText className="mx-4 text-text-tertiary uppercase" align="center">
          {children}
        </CaptionText>
      ) : null}
    </div>
  );
};
