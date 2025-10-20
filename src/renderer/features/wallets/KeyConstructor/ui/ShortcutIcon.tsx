import { useI18n } from '@/shared/i18n';

export const ShortcutIcon = () => {
  const { t } = useI18n();

  return (
    <span className="flex h-fit w-fit max-w-full shrink-0 truncate rounded-md bg-action-background-hover px-1 py-0.5 text-caption text-text-secondary select-none">
      {t('dynamicDerivations.keysConstructor.addNewKeyShortcut')}
    </span>
  );
};
