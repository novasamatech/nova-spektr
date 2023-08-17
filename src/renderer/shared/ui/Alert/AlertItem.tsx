import { PropsWithChildren } from 'react';

import { FootnoteText } from '../Typography';

type Props = {
  withDot?: boolean;
};

export const AlertItem = ({ withDot = true, children }: PropsWithChildren<Props>) => (
  <li className="flex gap-x-1">
    {withDot && <span className="shrink-0 w-1 h-1 rounded-full bg-text-secondary mt-[7px]" />}
    <FootnoteText className="text-text-secondary tracking-tight">{children}</FootnoteText>
  </li>
);
