import { ReactNode } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { FootnoteText } from '@renderer/shared/ui';
import { HelpText } from '../Typography';
import { DotStyles, TitleStyles } from './common/constants';
import { Variant } from './common/types';

type Props = {
  title: string | ReactNode;
  subtitle?: string;
  variant: Variant;
  className?: string;
};

export const StatusMark = ({ title, subtitle, variant, className }: Props) => (
  <div className={cnTw('grid grid-flow-col gap-x-1.5', className)}>
    <span className={cnTw('w-2 h-2 mt-1.5 rounded-full row-span-2', DotStyles[variant])} />
    {typeof title === 'string' ? <FootnoteText className={TitleStyles[variant]}>{title}</FootnoteText> : title}
    {subtitle && <HelpText className="text-text-tertiary">{subtitle}</HelpText>}
  </div>
);
