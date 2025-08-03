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
      <div className={cnTw('spektr-vertical-separator border-divider flex items-center', className)}>
        {children ? (
          <CaptionText className="text-text-tertiary my-4 uppercase" align="center">
            {children}
          </CaptionText>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cnTw('spektr-separator border-divider flex w-full items-center', className)}>
      {children ? (
        <CaptionText className="text-text-tertiary mx-4 uppercase" align="center">
          {children}
        </CaptionText>
      ) : null}
    </div>
  );
};
