import { ReactNode } from 'react';

import { Popover, FootnoteText, LabelHelpBox } from '@renderer/shared/ui';

type Props = {
  labelText: string;
  children: ReactNode;
};

export const StakingPopover = ({ children, labelText }: Props) => (
  <Popover
    contentClass="p-4"
    offsetPx={1}
    panelClass="w-[230px]"
    content={
      <section className="flex flex-col gap-y-2">
        <FootnoteText className="text-text-secondary">{children}</FootnoteText>
      </section>
    }
  >
    <LabelHelpBox>{labelText}</LabelHelpBox>
  </Popover>
);
