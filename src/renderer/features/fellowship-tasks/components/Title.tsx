import { useI18n } from '@/shared/i18n';

export const Title = () => {
  const { t } = useI18n();
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-filter-border bg-card-background px-5">
      <span className="text-button-small">{t('fellowship.tasks.cardTitle')}</span>
    </div>
  );
};
