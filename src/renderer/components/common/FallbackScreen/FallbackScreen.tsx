import { Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const FallbackScreen = () => {
  const { t } = useI18n();

  return (
    <main className="flex flex-col gap-4 items-center justify-center bg-stripes bg-cover h-screen">
      <Icon as="img" name="logo" size={120} alt="Omni logo" />
      <h1 className="text-3xl font-semibold">{t('fallbackScreen.message')}</h1>
      <Button weight="lg" variant="fill" pallet="error" onClick={() => window.location.reload()}>
        {t('fallbackScreen.reloadButton')}
      </Button>
    </main>
  );
};

export default FallbackScreen;
