import { memo } from 'react';

import { useI18n } from '@/shared/i18n';

type Props = {
  count: number;
};

export const Title = memo(({ count }: Props) => {
  const { t } = useI18n();
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-filter-border bg-card-background px-5">
      <span className="flex gap-1.5 text-button-small">
        <span>{t('fellowship.tasks.cardTitle')}</span>
        <span className="text-text-tertiary">{count.toString()}</span>
      </span>
    </div>
  );
});
