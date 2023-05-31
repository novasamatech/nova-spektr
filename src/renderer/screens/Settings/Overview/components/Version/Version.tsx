import { Icon } from '@renderer/components/ui';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { useI18n } from '@renderer/context/I18nContext';

export const Version = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-y-4">
      <Icon name="logo" size={48} />
      <HelpText className="text-text-tertiary">
        {t('settings.overview.versionLabel')} {process.env.VERSION}
      </HelpText>
    </div>
  );
};
