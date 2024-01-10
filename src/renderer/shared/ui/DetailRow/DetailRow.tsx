import { PropsWithChildren, ReactNode } from 'react';

import { FootnoteText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

type Props = {
  label: ReactNode;
  className?: string;
};

const DetailRow = ({ label, className, children }: PropsWithChildren<Props>) => (
  <div className="flex justify-between items-center w-full">
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

export default DetailRow;
