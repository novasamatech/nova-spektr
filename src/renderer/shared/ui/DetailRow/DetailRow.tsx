import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '../Typography';

type Props = {
  label: ReactNode;
  className?: string;
  wrapperClassName?: string;
  testId?: string;
};

export const DetailRow = ({ label, className, wrapperClassName, testId, children }: PropsWithChildren<Props>) => (
  <div
    className={cnTw('flex min-h-6 w-full items-center justify-between gap-2', wrapperClassName)}
    data-testid={testId}
  >
    {typeof label === 'string' ? (
      <FootnoteText as="dt" className="text-text-tertiary">
        {label}
      </FootnoteText>
    ) : (
      <dt className={cnTw('flex items-center gap-1', className)}>{label}</dt>
    )}

    {typeof children === 'string' ? (
      <FootnoteText as="dd" align="right" className={cnTw('justify-end py-[3px] ps-2', className)}>
        {children}
      </FootnoteText>
    ) : (
      <dd className={cnTw('flex max-w-[70%] min-w-32 items-center justify-end text-footnote', className)}>
        {children}
      </dd>
    )}
  </div>
);
