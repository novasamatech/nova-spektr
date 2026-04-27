import { type ReactNode } from 'react';

import { BodyText, CaptionText, HelpText } from '@/shared/ui';

type SectionCardProps = {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
};

export const SectionCard = ({ number, title, description, children }: SectionCardProps) => (
  <div className="flex flex-col gap-y-4 rounded-lg border border-container-border bg-white p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-icon-accent/12">
        <CaptionText className="text-icon-accent">{number}</CaptionText>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-y-1">
        <BodyText className="text-text-primary">{title}</BodyText>
        {description && <HelpText className="text-text-tertiary">{description}</HelpText>}
      </div>
    </div>
    <div className="flex flex-col gap-y-2">{children}</div>
  </div>
);
