import { type PropsWithChildren } from 'react';

import { TitleText } from '../Typography';
import { cnTw } from '../../lib/utils';

type Props = {
  title: string;
  titleClass?: string;
  headerClass?: string;
};

export const Header = ({ title, children, titleClass, headerClass }: PropsWithChildren<Props>) => (
  <header
    className={cnTw(
      'w-full px-6 pt-[19px] pb-4.5 bg-top-nav-bar-background border-b border-container-border',
      children && 'flex justify-between',
      headerClass,
    )}
  >
    <TitleText as="h1" className={titleClass}>
      {title}
    </TitleText>
    {children}
  </header>
);
