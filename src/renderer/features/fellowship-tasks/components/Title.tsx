import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';

type Props = {
  count: number;
};

export const Title = memo(({ count }: Props) => {
  const { t } = useI18n();
  return (
    <div
      className="flex h-11 shrink-0 items-center border-b border-filter-border bg-card-background px-5"
      data-testid={TEST_IDS.FELLOWSHIP.TASKS_TITLE}
    >
      <span className="flex gap-1.5 text-button-small">
        <span>{t('fellowship.tasks.cardTitle')}</span>
        <span className="text-text-tertiary" data-testid={TEST_IDS.FELLOWSHIP.TASKS_COUNT}>
          {count.toString()}
        </span>
      </span>
    </div>
  );
});
