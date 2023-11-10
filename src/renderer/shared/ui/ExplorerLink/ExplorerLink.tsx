import { FootnoteText, Icon } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { DefaultExplorer, ExplorerIcons } from './constants';

type Props = {
  name: string;
  href?: string;
};

export const ExplorerLink = ({ name, href }: Props) => {
  const { t } = useI18n();

  if (!href) return null;

  return (
    <a
      className="flex items-center gap-x-2 p-2 select-none rounded-md"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} size={12} />
      <FootnoteText as="span" className="text-text-secondary">
        {t('general.explorers.explorerButton', { name })}
      </FootnoteText>
    </a>
  );
};
