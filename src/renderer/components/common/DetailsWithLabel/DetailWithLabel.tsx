import { PropsWithChildren, ReactNode } from 'react';
import cn from 'classnames';

import { FootnoteText } from '@renderer/components/ui-redesign';
import { LabelStyle, RowStyle } from '../../../screens/Operations/common/constants';
import cnTw from '@renderer/shared/utils/twMerge';

export type DetailWithLabelProps = PropsWithChildren<{ label: ReactNode }>;

const DetailWithLabel = ({ label, children, className }: DetailWithLabelProps & { className: string }) => (
  <div className={cnTw(RowStyle)}>
    {typeof label === 'string' ? (
      <FootnoteText as="dt" className={LabelStyle}>
        {label}
      </FootnoteText>
    ) : (
      <dt className={cn('flex items-center gap-1', className)}>{label}</dt>
    )}

    {typeof children === 'string' ? (
      <FootnoteText as="dd" align="right" className={cn(className, 'w-1/2 justify-end py-[3px]')}>
        {children}
      </FootnoteText>
    ) : (
      <dd className={cn('flex w-1/2 items-center justify-end gap-1', className)}>{children}</dd>
    )}
  </div>
);

export default DetailWithLabel;
