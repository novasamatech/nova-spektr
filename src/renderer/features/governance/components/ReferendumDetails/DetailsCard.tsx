import { type PropsWithChildren, type ReactNode } from 'react';

import { Plate, SmallTitleText } from '@/shared/ui';

type Props = PropsWithChildren<{
  title?: ReactNode;
  action?: ReactNode;
}>;

export const DetailsCard = ({ title, action, children }: Props) => {
  return (
    <Plate className="shadow-card-shadow border-filter-border flex grow basis-[350px] flex-col gap-6 p-6">
      {title || action ? (
        <div className="flex justify-between gap-2">
          <SmallTitleText>{title}</SmallTitleText>
          {action}
        </div>
      ) : null}
      {children}
    </Plate>
  );
};
