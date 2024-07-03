import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Icon, BodyText } from '@shared/ui';
import { referendumListModel } from '@features/governance';
import { governancePageModel } from '../model/governance-page-model';

export const EmptyGovernance = () => {
  const { t } = useI18n();
  const ongoing = useUnit(governancePageModel.$ongoing);
  const completed = useUnit(governancePageModel.$completed);
  const isLoading = useUnit(referendumListModel.$isLoading);

  if (ongoing.size > 0 || completed.size > 0 || isLoading) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-y-8 w-full h-full">
      <Icon as="img" name="emptyList" alt={t('governance.emptyStateLabel')} size={178} />
      <BodyText align="center" className="text-text-tertiary">
        {t('governance.emptyStateLabel')}
        <br />
        {t('governance.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
