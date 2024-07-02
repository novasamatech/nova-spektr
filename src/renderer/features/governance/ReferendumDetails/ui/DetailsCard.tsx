import { FC, PropsWithChildren, ReactNode } from 'react';

import { Plate, SmallTitleText } from '@shared/ui';

type Props = PropsWithChildren<{
  title: ReactNode;
}>;

export const DetailsCard: FC<Props> = ({ title, children }) => {
  return (
    <Plate className="flex flex-col gap-6 p-6 shadow-card-shadow border-filter-border grow basis-[350px]">
      <SmallTitleText>{title}</SmallTitleText>
      {children}
    </Plate>
  );
};
