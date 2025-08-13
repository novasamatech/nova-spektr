import { truncate } from 'lodash';

import { useI18n } from '@/shared/i18n';
import { Tooltip } from '@/shared/ui-kit';

type Props = {
  amount: string;
  code: string;
  symbol?: string;
};

const MAX_LENGTH = 16;
const ELLIPSIS = '…';

export const Price = ({ amount, code, symbol }: Props) => {
  const { t } = useI18n();

  const priceText = symbol ? t('price.withSymbol', { amount, symbol }) : t('price.withCode', { amount, code });

  return priceText.length > MAX_LENGTH ? (
    <Tooltip>
      <Tooltip.Trigger>
        <span>{truncate(priceText, { length: MAX_LENGTH, omission: ELLIPSIS })}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{priceText}</Tooltip.Content>
    </Tooltip>
  ) : (
    <span>{priceText}</span>
  );
};
