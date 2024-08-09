import { type PropsWithChildren, type ReactNode } from 'react';

import { FootnoteText, LabelHelpBox, Popover } from '@shared/ui';

type Props = {
  labelText?: string;
  children: ReactNode;
};

const StakingRoot = ({ labelText, children }: PropsWithChildren<Props>) => (
  <Popover
    offsetPx={1}
    contentClass="p-4"
    panelClass="w-[230px]"
    wrapperClass="w-max"
    content={<ul className="flex list-disc flex-col gap-y-1 pl-5">{children}</ul>}
  >
    <LabelHelpBox>{labelText}</LabelHelpBox>
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
