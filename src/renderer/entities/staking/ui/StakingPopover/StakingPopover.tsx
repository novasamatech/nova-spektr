import { type PropsWithChildren, type ReactNode } from 'react';

import { FootnoteText, LabelHelpBox } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';

type Props = {
  labelText?: string;
  children: ReactNode;
};

const StakingRoot = ({ labelText, children }: PropsWithChildren<Props>) => (
  <Popover>
    <Popover.Trigger>
      <div>
        <LabelHelpBox>{labelText}</LabelHelpBox>
      </div>
    </Popover.Trigger>
    <Popover.Content>
      <ul className="flex w-[230px] list-disc flex-col gap-y-1 p-4 pl-5">{children}</ul>
    </Popover.Content>
  </Popover>
);

const ListItem = ({ children }: PropsWithChildren) => (
  <li>
    <FootnoteText className="text-text-secondary">{children}</FootnoteText>
  </li>
);

export const StakingPopover = Object.assign(StakingRoot, {
  Item: ListItem,
});
