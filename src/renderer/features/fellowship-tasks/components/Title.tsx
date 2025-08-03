import { memo } from 'react';

import { useI18n } from '@/shared/i18n';

type Props = {
  count: number;
};

export const Title = memo(({ count }: Props) => {
  const { t } = useI18n();
  return (
    <div className="border-filter-border bg-card-background flex h-11 shrink-0 items-center border-b px-5">
      <span className="text-button-small flex gap-1.5">
        <span>{t('fellowship.tasks.cardTitle')}</span>
        <span className="text-text-tertiary">{count.toString()}</span>
      </span>
    </div>
  );
});
