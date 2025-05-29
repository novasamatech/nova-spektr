import { type ComponentProps } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { Fee } from '../Fee/Fee';
import { FeeWithDataLoading } from '../FeeWithDataLoading/FeeWithDataLoading';

type Props = ComponentProps<typeof FeeWithDataLoading> & {
  label?: string;
  wrapperClassName?: string;
};

/** @deprecated Use FeeWithLabel with complexTxStore instead */
export const FeeWithLabelWithDataLoading = ({ label, wrapperClassName, ...feeProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">{label || t('operation.networkFee')}</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
      testId={TEST_IDS.OPERATIONS.ESTIMATE_FEE}
    >
      <FeeWithDataLoading {...feeProps} />
    </DetailRow>
  );
};

type FeeWithLabelProps = ComponentProps<typeof Fee> & {
  label?: string;
  wrapperClassName?: string;
};

export const FeeWithLabel = ({ label, wrapperClassName, ...feeProps }: FeeWithLabelProps) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">{label || t('operation.networkFee')}</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
      testId={TEST_IDS.OPERATIONS.ESTIMATE_FEE}
    >
      <Fee {...feeProps} />
    </DetailRow>
  );
};
