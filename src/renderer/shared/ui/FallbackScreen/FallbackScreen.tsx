import { useI18n } from '@/shared/i18n';
import { Graphics } from '@/shared/ui-kit';
import { Button } from '../Buttons';
import { BodyText } from '../Typography';

export const FallbackScreen = () => {
  const { t } = useI18n();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 bg-cover">
      <Graphics name="computer" size={172} />
      <BodyText className="text-text-tertiary">{t('fallbackScreen.message')}</BodyText>
      <Button onClick={() => window.location.reload()}>{t('fallbackScreen.reloadButton')}</Button>
    </main>
  );
};
