import { type PropsWithChildren, type ReactNode } from 'react';

import { Plate, SmallTitleText } from '@/shared/ui';

type Props = PropsWithChildren<{
  title?: ReactNode;
  action?: ReactNode;
}>;

export const DetailsCard = ({ title, action, children }: Props) => {
  return (
    <Plate className="flex grow basis-[350px] flex-col gap-6 border-filter-border p-6 shadow-card-shadow">
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
