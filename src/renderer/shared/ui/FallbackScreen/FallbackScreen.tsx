import { useI18n } from '@/shared/i18n';
import { Button } from '../Buttons';
import { Icon } from '../Icon/Icon';
import { BodyText } from '../Typography';

export const FallbackScreen = () => {
  const { t } = useI18n();

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 bg-cover">
      <Icon as="img" name="computer" size={172} />
      <BodyText className="text-text-tertiary">{t('fallbackScreen.message')}</BodyText>
      <Button onClick={() => window.location.reload()}>{t('fallbackScreen.reloadButton')}</Button>
    </main>
  );
};
