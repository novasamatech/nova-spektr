import { type ReactNode } from 'react';

import { cnTw } from '@shared/lib/utils';
import { FootnoteText, HelpText } from '../Typography';

import { DotStyles, TitleStyles } from './common/constants';
import { type Variant } from './common/types';

type Props = {
  title: string | ReactNode;
  subtitle?: string;
  variant: Variant;
  className?: string;
};

export const StatusLabel = ({ title, subtitle, variant, className }: Props) => (
  <div className={cnTw('grid grid-flow-col gap-x-1.5', className)}>
    <span className={cnTw('row-span-2 mt-[5px] h-[9px] w-[9px] rounded-full', DotStyles[variant])} />
    {typeof title === 'string' ? <FootnoteText className={TitleStyles[variant]}>{title}</FootnoteText> : title}
    {subtitle && <HelpText className="text-text-tertiary">{subtitle}</HelpText>}
  </div>
);
