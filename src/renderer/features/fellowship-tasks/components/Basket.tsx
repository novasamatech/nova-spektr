import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { useFellowshipAccount } from '@/aggregates/fellowship-member';
import { SignTransactionsModal, signOperations } from '@/features/basket-operations';
import { useMemberBasketOperations } from '../hooks/useMemberBasketOperations';

export const Basket = memo(() => {
  const { t } = useI18n();
  const { data: account } = useFellowshipAccount();
  const { data: operations } = useMemberBasketOperations();

  if (nullable(account) || !basketUtils.isBasketAvailableForAccount(account)) return null;

  const transactions = useMemo(() => {
    return Object.values(operations).filter(nonNullable);
  }, []);

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
