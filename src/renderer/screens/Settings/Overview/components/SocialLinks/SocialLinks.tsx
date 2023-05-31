import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText, Plate, BodyText } from '@renderer/components/ui-redesign';
import { HelpText } from '@renderer/components/ui-redesign/Typography';

const Links = [
  {
    icon: 'twitter',
    title: 'settings.overview.twitterLabel',
    subtitle: 'settings.overview.twitterDescription',
    href: 'https://twitter.com/NovasamaTech',
  },
  {
    icon: 'github',
    title: 'settings.overview.githubLabel',
    subtitle: 'settings.overview.githubDescription',
    href: 'https://github.com/novasamatech/nova-spektr',
  },
  {
    icon: 'youtube',
    title: 'settings.overview.youtubeLabel',
    subtitle: 'settings.overview.youtubeDescription',
    href: 'https://www.youtube.com/@NovasamaTech',
  },
  {
    icon: 'medium',
    title: 'settings.overview.mediumLabel',
    subtitle: 'settings.overview.mediumDescription',
    href: 'https://medium.com',
  },
  {
    icon: 'telegram',
    title: 'settings.overview.telegramLabel',
    subtitle: 'settings.overview.telegramDescription',
    href: 'https://telegram.com',
  },
] as const;

export const SocialLinks = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.overview.socialLabel')}</FootnoteText>

      <ul className="flex flex-col gap-y-2">
        {Links.map((link) => (
          <Plate as="li" key={link.title} className="p-0">
            <a
              className="grid grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 p-3 rounded-md"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon className="text-icon-default row-span-2" name={link.icon} size={36} />
              <BodyText>{t(link.title)}</BodyText>
              <HelpText className="text-text-tertiary">{t(link.subtitle)}</HelpText>
              <Icon className="text-icon-default row-span-2" name="link" size={16} />
            </a>
          </Plate>
        ))}
      </ul>
    </div>
  );
};
