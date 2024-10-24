import './Separator.css';

import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '../Typography';

type Props = PropsWithChildren<{
  className?: string;
}>;

export const Separator = ({ className, children }: Props) => {
  return (
    <div className={cnTw('spektr-separator flex w-full items-center border-divider', className)}>
      {children ? (
        <CaptionText className="mx-4 uppercase text-text-tertiary" align="center">
          {children}
        </CaptionText>
      ) : null}
    </div>
  );
};
