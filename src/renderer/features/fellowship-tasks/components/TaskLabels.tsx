import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Label, type LabelVariant } from '@/shared/ui-kit';

type Props = {
  tags: string[];
};

const tagLabels: Record<string, { text: string; color: LabelVariant }> = {
  urgent: {
    text: 'fellowship.tasks.labels.urgent',
    color: 'red',
  },
  controversial: {
    text: 'fellowship.tasks.labels.controversial',
    color: 'blue',
  },
  importantVote: {
    text: 'fellowship.tasks.labels.importantVote',
    color: 'green',
  },
};

export const TaskLabels = memo(({ tags }: Props) => {
  const { t } = useI18n();

  return tags.map(tag => {
    const labelConfig = tagLabels[tag];
    return (
      <Label key={tag} variant={labelConfig?.color ?? 'gray'}>
        {t(labelConfig?.text ?? tag)}
      </Label>
    );
  });
});
