import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@shared/lib/utils';
import { FootnoteText } from '../Typography';

type Props = {
  label: ReactNode;
  className?: string;
  wrapperClassName?: string;
};

export const DetailRow = ({ label, className, wrapperClassName, children }: PropsWithChildren<Props>) => (
  <div className={cnTw('flex w-full items-center justify-between', wrapperClassName)}>
    {typeof label === 'string' ? (
      <FootnoteText as="dt" className="text-text-tertiary">
        {label}
      </FootnoteText>
    ) : (
      <dt className={cnTw('flex items-center gap-1', className)}>{label}</dt>
    )}

    {typeof children === 'string' ? (
      <FootnoteText as="dd" align="right" className={cnTw('justify-end px-2 py-[3px]', className)}>
        {children}
      </FootnoteText>
    ) : (
      <dd className={cnTw('flex min-w-40 items-center justify-end text-end', className)}>{children}</dd>
    )}
  </div>
);
