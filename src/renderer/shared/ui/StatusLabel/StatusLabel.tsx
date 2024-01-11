import { ReactNode } from 'react';

import { cnTw } from '@shared/lib/utils';
import { FootnoteText } from '@shared/ui';
import { HelpText } from '@shared/ui/Typography';
import { DotStyles, TitleStyles } from './common/constants';
import { Variant } from './common/types';

type Props = {
  title: string | ReactNode;
  subtitle?: string;
  variant: Variant;
  className?: string;
};

export const StatusLabel = ({ title, subtitle, variant, className }: Props) => (
  <div className={cnTw('grid grid-flow-col gap-x-1.5', className)}>
    <span className={cnTw('w-[9px] h-[9px] mt-[5px] rounded-full row-span-2', DotStyles[variant])} />
    {typeof title === 'string' ? <FootnoteText className={TitleStyles[variant]}>{title}</FootnoteText> : title}
    {subtitle && <HelpText className="text-text-tertiary">{subtitle}</HelpText>}
  </div>
);
