import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { XcmFee } from '../XcmFee/XcmFee';

type Props = ComponentProps<typeof XcmFee> & {
  label?: string;
  wrapperClassName?: string;
};

export const XcmFeeWithLabel = ({ label, wrapperClassName, ...feeProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">{label || t('operation.xcmFee')}</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <XcmFee {...feeProps} />
    </DetailRow>
  );
};
