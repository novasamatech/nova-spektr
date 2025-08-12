import { useI18n } from '@/shared/i18n';
import { Tooltip } from '@/shared/ui-kit';

type Props = {
  amount: string;
  code: string;
  symbol?: string;
};

const MAX_LENGTH = 16;
const ELLIPSIS = '…';

function truncatePrice(price: string) {
  if (price.length <= MAX_LENGTH) {
    return price;
  }
  const truncateEndIndex = MAX_LENGTH - ELLIPSIS.length;
  return price.slice(0, truncateEndIndex).concat(ELLIPSIS);
}

export const Price = ({ amount, code, symbol }: Props) => {
  const { t } = useI18n();

  const priceText = symbol ? t('price.withSymbol', { amount, symbol }) : t('price.withCode', { amount, code });

  return priceText.length > MAX_LENGTH ? (
    <Tooltip>
      <Tooltip.Trigger>
        <span>{truncatePrice(priceText)}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{priceText}</Tooltip.Content>
    </Tooltip>
  ) : (
    <span>{priceText}</span>
  );
};
