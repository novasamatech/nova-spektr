import { useI18n } from '@renderer/app/providers';

type Props = {
  amount: string;
  code: string;
  symbol?: string;
};

export const Price = ({ amount, code, symbol }: Props) => {
  const { t } = useI18n();

  return <>{symbol ? t('price.withSymbol', { amount, symbol }) : t('price.withCode', { amount, code })}</>;
};
