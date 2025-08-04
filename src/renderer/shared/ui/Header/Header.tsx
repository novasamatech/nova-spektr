import { type PropsWithChildren } from 'react';

import { cnTw, nonNullable } from '@/shared/lib/utils';
import { TitleText } from '../Typography';

type Props = {
  title: string;
  titleClass?: string;
  headerClass?: string;
};

export const Header = ({ title, children, titleClass, headerClass }: PropsWithChildren<Props>) => (
  <header
    className={cnTw(
      'w-full border-b border-container-border bg-top-nav-bar-background px-6 pt-[19px] pb-4.5',
      {
        'flex justify-between': nonNullable(children),
      },
      headerClass,
    )}
  >
    <TitleText as="h1" className={titleClass}>
      {title}
    </TitleText>
    {children}
  </header>
);
