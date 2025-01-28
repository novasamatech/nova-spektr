import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { profile } from '../model/profile';

import { EvidenceSalaryModal } from './EvidenceSalaryModal';

export const EntrypointCard = memo(() => {
  const { t } = useI18n();
  const member = useUnit(profile.$member);

  return (
    <EvidenceSalaryModal>
      <button className="rounded-xl border border-filter-border bg-card-background text-button-small">
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2} padding={4}>
          <Box direction="row" verticalAlign="center" gap={2}>
            <Icon name="defaultExplorer" size={16} />

            {t('fellowship.salary.cardTitle')}
          </Box>

          <Icon name="right" size={16} />
        </Box>
      </button>
    </EvidenceSalaryModal>
  );
});
