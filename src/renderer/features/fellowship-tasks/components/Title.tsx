import { memo } from 'react';

import { useI18n } from '@/shared/i18n';

type Props = {
  count: number;
};

export const Title = memo(({ count }: Props) => {
  const { t } = useI18n();
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-filter-border bg-card-background px-5">
      <span className="text-button-small">
        {t('fellowship.tasks.cardTitle')}&nbsp;{count.toString()}
      </span>
    </div>
  );
});
