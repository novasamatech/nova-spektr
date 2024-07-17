import { type ComponentProps } from 'react';

import { useI18n } from '@app/providers';
import { DetailRow, FootnoteText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { Fee } from '../Fee/Fee';

type Props = ComponentProps<typeof Fee> & {
  label?: string;
  wrapperClassName?: string;
};

export const FeeWithLabel = ({ label, wrapperClassName, ...feeProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">{label || t('operation.networkFee')}</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <Fee {...feeProps} />
    </DetailRow>
  );
};
