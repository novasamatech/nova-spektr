import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@shared/lib/utils';
import { FootnoteText } from '@shared/ui';

type Props = {
  label: ReactNode;
  className?: string;
  wrapperClassName?: string;
};

export const DetailRow = ({ label, className, wrapperClassName, children }: PropsWithChildren<Props>) => (
  <div className={cnTw('flex justify-between items-center w-full', wrapperClassName)}>
    {typeof label === 'string' ? (
      <FootnoteText as="dt" className="text-text-tertiary">
        {label}
      </FootnoteText>
    ) : (
      <dt className={cnTw('flex items-center gap-1', className)}>{label}</dt>
    )}

    {typeof children === 'string' ? (
      <FootnoteText as="dd" align="right" className={cnTw('justify-end py-[3px] px-2', className)}>
        {children}
      </FootnoteText>
    ) : (
      <dd className={cnTw('flex items-center justify-end', className)}>{children}</dd>
    )}
  </div>
);
