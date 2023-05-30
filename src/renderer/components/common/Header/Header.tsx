import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { TitleText } from '@renderer/components/ui-redesign/Typography';

type Props = {
  title: string;
};

const Header = ({ title, children }: PropsWithChildren<Props>) => (
  <header
    className={cn(
      'w-full px-6 py-4.5 bg-top-nav-bar-background border-b border-container-border',
      children && 'flex justify-between',
    )}
  >
    <TitleText as="h1">{title}</TitleText>
    {children}
  </header>
);

export default Header;
