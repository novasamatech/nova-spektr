import { useI18n } from '@app/providers';
import { Button } from '../Buttons';
import { Icon } from '../Icon/Icon';
import { BodyText } from '../Typography';

export const FallbackScreen = () => {
  const { t } = useI18n();

  return (
    <main className="flex flex-col gap-4 items-center justify-center bg-cover h-screen">
      <Icon as="img" name="computer" size={172} />
      <BodyText className="text-text-tertiary">{t('fallbackScreen.message')}</BodyText>
      <Button onClick={() => window.location.reload()}>{t('fallbackScreen.reloadButton')}</Button>
    </main>
  );
};
