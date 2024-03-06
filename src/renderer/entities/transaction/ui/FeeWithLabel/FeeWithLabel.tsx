import { ComponentProps } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, DetailRow } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { Fee } from '../Fee/Fee';

type Props = ComponentProps<typeof Fee> & {
  wrapperClassName?: string;
};

export const FeeWithLabel = ({ wrapperClassName, ...feeProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <Fee {...feeProps} />
    </DetailRow>
  );
};
