import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { SignTransactionsModal, signOperations } from '@/features/basket-operations';
import { fellowshipTasksFeature } from '../model/feature';
import { tasks } from '../model/tasks';

export const Basket = memo(() => {
  const { t } = useI18n();
  const input = useUnit(fellowshipTasksFeature.input);
  const transactions = useUnit(tasks.$basketOperations);

  if (nullable(input?.account) || !basketUtils.isBasketAvailableForAccount(input.account)) return null;

  const openSigning = () => {
    signOperations.startFlow({ transactions });
  };

  return (
    <div className="mt-auto shrink-0 border-t border-filter-border bg-card-background">
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2} padding={[3, 4]} shrink={0}>
        <Box direction="row" gap={1.5}>
          <FootnoteText className="text-text-secondary">
            {t('fellowship.tasks.reviewBasketTitle', { count: transactions.length })}
          </FootnoteText>
          <FootnoteText className="text-text-tertiary">{transactions.length.toString()}</FootnoteText>
        </Box>
        <Button size="sm" disabled={transactions.length === 0} onClick={openSigning}>
          {t('fellowship.tasks.reviewBasket')}
        </Button>
      </Box>
      <SignTransactionsModal />
    </div>
  );
});
