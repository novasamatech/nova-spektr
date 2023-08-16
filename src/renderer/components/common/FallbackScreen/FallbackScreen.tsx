import { BodyText, Button } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import Fallback from '@images/misc/computer.webp';

const FallbackScreen = () => {
  const { t } = useI18n();

  return (
    <main className="flex flex-col gap-4 items-center justify-center bg-cover h-screen">
      <img src={Fallback} alt="" width={172} height={172} />
      <BodyText className="text-text-tertiary">{t('fallbackScreen.message')}</BodyText>
      <Button onClick={() => window.location.reload()}>{t('fallbackScreen.reloadButton')}</Button>
    </main>
  );
};

export default FallbackScreen;
