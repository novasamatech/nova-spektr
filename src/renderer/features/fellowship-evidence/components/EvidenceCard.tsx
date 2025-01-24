import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';

import { RetentionEvidenceFormModal } from './RetentionEvidenceFormModal';

export const EvidenceCard = memo(() => {
  const { t } = useI18n();

  return (
    <RetentionEvidenceFormModal>
      <button className="rounded-xl border border-filter-border bg-card-background text-button-small">
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2} padding={4}>
          <Box direction="row" verticalAlign="center" gap={2}>
            <Icon name="whitelistVoting" size={16} />

            {t('fellowship.evidence.cardTitle')}
          </Box>

          <Icon name="right" size={16} />
        </Box>
      </button>
    </RetentionEvidenceFormModal>
  );
});
