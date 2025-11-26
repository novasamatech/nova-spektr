import { differenceInDays } from 'date-fns';
import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui-kit';
import { useRetentionPeriodDates } from '@/aggregates/fellowship-retention';
import { PROMOTION_WARNING_THRESHOLD_DAYS, RETENTION_WARNING_THRESHOLD_DAYS } from '../constants';

type Props = PropsWithChildren<{
  wish: 'Promotion' | 'Retention';
  onConfirm: () => void;
}>;

export const SubmitPeriodWarningAlert = ({ wish, onConfirm, children }: Props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const { data: retentionPeriodDates } = useRetentionPeriodDates();

  const shouldShowWarning = useMemo(() => {
    if (nullable(retentionPeriodDates) || nullable(retentionPeriodDates.to)) {
      return false;
    }

    const daysUntilEnd = differenceInDays(retentionPeriodDates.to, new Date());

    if (wish === 'Retention') {
      return daysUntilEnd < RETENTION_WARNING_THRESHOLD_DAYS;
    }

    if (wish === 'Promotion') {
      return daysUntilEnd < PROMOTION_WARNING_THRESHOLD_DAYS;
    }

    return false;
  }, [wish, retentionPeriodDates]);

  const translationKey = wish === 'Retention' ? 'retentionPeriodWarning' : 'promotionPeriodWarning';

  const handleClick = useCallback(() => {
    if (shouldShowWarning) {
      setIsOpen(true);
    } else {
      onConfirm();
    }
  }, [shouldShowWarning, onConfirm]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <div onClick={handleClick}>{children}</div>

      <ConfirmModal
        isOpen={isOpen}
        title={t(`fellowship.salary.evidence.${translationKey}.title`)}
        description={
          <FootnoteText className="text-text-tertiary" align="center">
            {t(`fellowship.salary.evidence.${translationKey}.description`)}
          </FootnoteText>
        }
        cancelText={t(`fellowship.salary.evidence.${translationKey}.cancel`)}
        confirmText={t(`fellowship.salary.evidence.${translationKey}.submit`)}
        onToggle={setIsOpen}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
};
