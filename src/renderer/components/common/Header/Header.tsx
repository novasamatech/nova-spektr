import { PropsWithChildren } from 'react';

import { TitleText } from '@shared/ui/Typography';
import { cnTw } from '@shared/lib/utils';

type Props = {
  title: string;
  titleClass?: string;
  headerClass?: string;
};

const Header = ({ title, children, titleClass, headerClass }: PropsWithChildren<Props>) => (
  <header
    className={cnTw(
      'w-full px-6 pt-[19px] pb-4.5 bg-top-nav-bar-background border-b border-container-border', // bottom padding 1 px less because we have 1px border-bottom
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

export default Header;
