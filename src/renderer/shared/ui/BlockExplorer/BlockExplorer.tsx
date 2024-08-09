import { type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Icon } from '../Icon/Icon';
import { type IconNames } from '../Icon/data';
import { FootnoteText } from '../Typography';

type Props = PropsWithChildren<{
  href: string;
  icon: IconNames;
}>;

export const BlockExplorer = ({ href, icon, children }: Props) => {
  return (
    <a
      className={cnTw(
        'flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-text-secondary',
        'transition-colors',
        'focus:text-text-primary focus:ring-2',
        'hover:bg-action-background-hover hover:text-text-primary',
      )}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <Icon name={icon} size={16} />
      <FootnoteText as="span" className="text-inherit">
        {children}
      </FootnoteText>
    </a>
  );
};
