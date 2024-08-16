import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { BodyText, Icon } from '@shared/ui';
import { governancePageAggregate } from '../aggregates/governancePage';

type Props = {
  isLoading: boolean;
  isConnected: boolean;
};

export const EmptyGovernance = ({ isConnected, isLoading }: Props) => {
  const { t } = useI18n();
  const ongoing = useUnit(governancePageAggregate.$ongoing);
  const completed = useUnit(governancePageAggregate.$completed);

  if (ongoing.length > 0 || completed.length > 0 || isLoading || !isConnected) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-8">
      <Icon as="img" name="emptyList" alt={t('governance.emptyStateLabel')} size={178} />
      <BodyText align="center" className="text-text-tertiary">
        {t('governance.emptyStateLabel')}
        <br />
        {t('governance.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
