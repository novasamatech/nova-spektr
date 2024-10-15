import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '../Typography';

type Props = {
  active?: boolean;
  withDot?: boolean;
  className?: string;
};

export const AlertItem = ({ active = true, withDot = true, children, className }: PropsWithChildren<Props>) => {
  if (!active) {
    return null;
  }

  return (
    <li className={cnTw('flex gap-x-1', className)}>
      {withDot && <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-secondary" />}
      <FootnoteText className="max-w-full tracking-tight text-text-secondary">{children}</FootnoteText>
    </li>
  );
};
