import { Slot } from '@radix-ui/react-slot';
import { differenceInDays } from 'date-fns';
import { type HTMLAttributes, type ReactElement, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui-kit';
import { useRetentionPeriodDates } from '@/aggregates/fellowship-retention';
import { PROMOTION_WARNING_THRESHOLD_DAYS, RETENTION_WARNING_THRESHOLD_DAYS } from '../constants';

type RadixIntegration = Pick<
  HTMLAttributes<Element>,
  | 'onClick'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onPointerMove'
  | 'onPointerLeave'
>;

type Props = RadixIntegration & {
  wish: 'Promotion' | 'Retention';
  onConfirm: () => void;
  children: ReactElement;
};

export const SubmitPeriodWarningAlert = ({ wish, onConfirm, children, ...radix }: Props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const { data: retentionPeriodDates } = useRetentionPeriodDates();

  const translationKey = wish === 'Promotion' ? 'promotionPeriodWarning' : 'retentionPeriodWarning';

  const shouldShowWarning = useMemo(() => {
    if (nullable(retentionPeriodDates) || nullable(retentionPeriodDates.to)) {
      return false;
    }

    const daysUntilEnd = differenceInDays(retentionPeriodDates.to, new Date());

    if (wish === 'Retention') {
      return daysUntilEnd > RETENTION_WARNING_THRESHOLD_DAYS;
    }

    if (wish === 'Promotion') {
      return daysUntilEnd < PROMOTION_WARNING_THRESHOLD_DAYS;
    }

    return false;
  }, [wish, retentionPeriodDates]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (shouldShowWarning) {
      setIsOpen(true);
    } else {
      onConfirm();
    }

    radix.onClick?.(e);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm();
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Slot {...radix} onClick={handleClick}>
        {children}
      </Slot>
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
