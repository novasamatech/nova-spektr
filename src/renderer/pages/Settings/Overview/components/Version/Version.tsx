import { useI18n } from '@/shared/i18n';
import { HelpText, Icon } from '@/shared/ui';

export const Version = () => {
  const { t } = useI18n();

  return (
    <div className="mt-4 flex flex-col items-center gap-y-2 pb-6">
      <Icon name="logo" size={48} />
      <HelpText className="text-text-tertiary">
        {t('settings.overview.versionLabel')} {process.env.VERSION}
      </HelpText>
    </div>
  );
};
