import { PropsWithChildren, ReactNode } from 'react';

import { Popover, FootnoteText, LabelHelpBox } from '@shared/ui';

type Props = {
  labelText?: string;
  children: ReactNode;
};

export const StakingPopover = ({ labelText, children }: PropsWithChildren<Props>) => (
  <Popover
    contentClass="p-4"
    offsetPx={1}
    panelClass="w-[230px]"
    content={<ul className="flex flex-col gap-y-1 list-disc pl-5">{children}</ul>}
  >
    <LabelHelpBox>{labelText}</LabelHelpBox>
  </Popover>
);

const PopoverListItem = ({ children }: PropsWithChildren) => (
  <li>
    <FootnoteText className="text-text-secondary">{children}</FootnoteText>
  </li>
);

StakingPopover.Item = PopoverListItem;
