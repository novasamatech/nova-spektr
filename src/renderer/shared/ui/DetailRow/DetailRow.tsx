import { PropsWithChildren, ReactNode } from 'react';
import cn from 'classnames';

import { FootnoteText } from '@renderer/shared/ui';

type Props = {
  label: ReactNode;
  className: string;
};

const DetailRow = ({ label, className, children }: PropsWithChildren<Props>) => (
  <div className="flex justify-between items-center w-full">
    {typeof label === 'string' ? (
      <FootnoteText as="dt" className="text-text-tertiary">
        {label}
      </FootnoteText>
    ) : (
      <dt className={cn('flex items-center gap-1', className)}>{label}</dt>
    )}

    {typeof children === 'string' ? (
      <FootnoteText as="dd" align="right" className={cn(className, 'justify-end py-[3px] px-2')}>
        {children}
      </FootnoteText>
    ) : (
      <dd className={cn('flex items-center justify-end', className)}>{children}</dd>
    )}
  </div>
);

export default DetailRow;
