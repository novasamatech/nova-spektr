import { type ReactNode } from 'react';

import { CountChip, FootnoteText } from '@/shared/ui';

type Props = {
  title: string;
  count: number;
  tone: 'accent' | 'negative';
  children: ReactNode;
};

export const QueueSubsection = ({ title, count, tone, children }: Props) => (
  <div className="flex flex-col gap-y-2">
    <div className="flex items-center gap-x-2">
      <FootnoteText className="font-medium text-text-secondary">{title}</FootnoteText>
      <CountChip count={count} tone={tone} />
    </div>
    <div className="flex flex-col gap-y-1.5">{children}</div>
  </div>
);
