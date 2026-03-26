import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { DeliveryFee } from '../DeliveryFee/DeliveryFee';

type Props = ComponentProps<typeof DeliveryFee> & {
  label?: string;
  wrapperClassName?: string;
};

export const DeliveryFeeWithLabel = ({ label, wrapperClassName, ...feeProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">{label || t('operation.deliveryFee')}</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <DeliveryFee {...feeProps} />
    </DetailRow>
  );
};
