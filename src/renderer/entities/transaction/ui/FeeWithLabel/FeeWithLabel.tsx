import { ComponentProps } from 'react';

// import { useI18n } from '@app/providers';
import { FootnoteText, DetailRow } from '@shared/ui';
import { Fee } from '../Fee/Fee';
import { cnTw } from '@shared/lib/utils';

type Props = {
  wrapperClassName?: string;
} & ComponentProps<typeof Fee>;

export const FeeWithLabel = ({ wrapperClassName, ...feeProps }: Props) => {
  // const { t } = useI18n();

  return (
    <DetailRow
      label={<FootnoteText className="text-text-tertiary">Network fee</FootnoteText>}
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <Fee {...feeProps} />
    </DetailRow>
  );
};
