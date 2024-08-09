import { useI18n } from '@app/providers';

type Props = {
  amount: string;
  code: string;
  symbol?: string;
};

export const Price = ({ amount, code, symbol }: Props) => {
  const { t } = useI18n();

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{symbol ? t('price.withSymbol', { amount, symbol }) : t('price.withCode', { amount, code })}</>;
};
