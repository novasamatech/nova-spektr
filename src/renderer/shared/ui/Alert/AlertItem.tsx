import { type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

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
      {withDot && <span className="shrink-0 w-1 h-1 rounded-full bg-text-secondary mt-[7px]" />}
      <FootnoteText className="text-text-secondary tracking-tight max-w-full">{children}</FootnoteText>
    </li>
  );
};
