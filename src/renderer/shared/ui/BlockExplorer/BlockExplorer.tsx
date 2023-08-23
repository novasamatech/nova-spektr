import { cnTw } from '@renderer/shared/lib/utils';
import { Icon, FootnoteText } from '@renderer/shared/ui';
import { DefaultExplorer, ExplorerIcons } from './constants';

type Props = {
  href: string;
  icon?: keyof typeof ExplorerIcons;
  children: string;
};

export const BlockExplorer = ({ href, icon = DefaultExplorer, children }: Props) => {
  return (
    <a
      className={cnTw(
        'rounded-s flex items-center gap-x-1.5 px-1.5b py-3b select-none outline-offset-1',
        'bg-bg-primary-default hover:bg-bg-primary-hover active:bg-bg-primary-hover group',
      )}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon as="img" name={ExplorerIcons[icon]} size={16} />

      <FootnoteText as="span" className="text-text-secondary group-active:text-text-primary">
        {children}
      </FootnoteText>
    </a>
  );
};
