import { PropsWithChildren } from 'react';

import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  withDot?: boolean;
};

const AlertItem = ({ withDot = true, children }: PropsWithChildren<Props>) => (
  <li className="flex gap-x-1">
    {withDot && <span className="shrink-0 w-1 h-1 rounded-full bg-text-secondary mt-[7px]" />}
    <FootnoteText className="text-text-secondary -tracking-[0.12px]">{children}</FootnoteText>
  </li>
);

export default AlertItem;
