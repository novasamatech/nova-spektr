import { useI18n } from '@app/providers';
import { cnTw } from '../../lib/utils';
import { Icon } from '../Icon/Icon';
import { FootnoteText } from '../Typography';

import { DefaultExplorer, ExplorerIcons } from './constants';

type Props = {
  name: string;
  href?: string;
};

export const ExplorerLink = ({ name, href }: Props) => {
  const { t } = useI18n();

  if (!href) {
    return null;
  }

  return (
    <a
      className={cnTw(
        'group flex items-center gap-x-1.5 px-1.5 py-[3px] select-none rounded-md transition-colors',
        'hover:bg-action-background-hover focus:bg-action-background-hover',
      )}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} size={12} />
      <FootnoteText
        as="span"
        className={cnTw(
          'text-text-secondary transition-colors',
          'group-hover:text-text-primary group-focus:text-text-primary',
        )}
      >
        {t('general.explorers.explorerButton', { name })}
      </FootnoteText>
    </a>
  );
};
