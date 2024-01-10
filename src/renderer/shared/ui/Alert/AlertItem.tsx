import { PropsWithChildren } from 'react';

import { FootnoteText } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  withDot?: boolean;
  className?: string;
};

const AlertItem = ({ withDot = true, children, className }: PropsWithChildren<Props>) => (
  <li className={cnTw('flex gap-x-1', className)}>
    {withDot && <span className="shrink-0 w-1 h-1 rounded-full bg-text-secondary mt-[7px]" />}
    <FootnoteText className="text-text-secondary tracking-tight max-w-full">{children}</FootnoteText>
  </li>
);

export default AlertItem;
