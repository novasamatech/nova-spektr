import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { type CurrencyItem } from '@/shared/api/price-provider';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText, Switch } from '@/shared/ui';
import { Select } from '@/shared/ui-kit';
import { type Callbacks, currencyFormModel } from '../model/currency-form';

const getCurrencyTitle = (currency: CurrencyItem): string => {
  return [currency.code, currency.symbol, currency.name].filter(nonNullable).join(' • ');
};

type Props = Callbacks;
export const CurrencyForm = ({ onSubmit }: Props) => {
  const { t } = useI18n();

  useEffect(() => {
    currencyFormModel.events.callbacksChanged({ onSubmit });
  }, [onSubmit]);

  useEffect(() => {
    currencyFormModel.events.formInitiated();
  }, []);

  const {
    submit,
    fields: { fiatFlag, currency },
  } = useForm(currencyFormModel.$currencyForm);

  const isFormValid = useUnit(currencyFormModel.$isFormValid);
  const cryptoCurrencies = useUnit(currencyFormModel.$cryptoCurrencies);
  const popularFiatCurrencies = useUnit(currencyFormModel.$popularFiatCurrencies);
  const unpopularFiatCurrencies = useUnit(currencyFormModel.$unpopularFiatCurrencies);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form className="flex flex-col gap-y-4" onSubmit={submitForm}>
      <Switch checked={fiatFlag?.value} className="gap-x-2" onChange={fiatFlag?.onChange}>
        <div className="flex flex-col">
          <FootnoteText>{t('settings.currency.switchLabel')}</FootnoteText>
          <HelpText className="text-text-tertiary">{t('settings.currency.switchHint')}</HelpText>
        </div>
      </Switch>

      <Select
        placeholder={t('settings.currency.selectPlaceholder')}
        disabled={!fiatFlag.value}
        value={currency.value.toString()}
        onChange={(value) => currency.onChange(Number(value))}
      >
        <Select.Group title={t('settings.currency.cryptocurrenciesLabel')}>
          {cryptoCurrencies.map((currency) => (
            <Select.Item key={currency.id} value={currency.id.toString()}>
              {getCurrencyTitle(currency)}
            </Select.Item>
          ))}
        </Select.Group>
        <Select.Group title={t('settings.currency.popularFiatLabel')}>
          {popularFiatCurrencies.map((currency) => (
            <Select.Item key={currency.id} value={currency.id.toString()}>
              {getCurrencyTitle(currency)}
            </Select.Item>
          ))}
        </Select.Group>
        <Select.Group title={t('settings.currency.unpopularFiatLabel')}>
          {unpopularFiatCurrencies.map((currency) => (
            <Select.Item key={currency.id} value={currency.id.toString()}>
              {getCurrencyTitle(currency)}
            </Select.Item>
          ))}
        </Select.Group>
      </Select>

      <Button className="ml-auto w-fit" type="submit" disabled={!isFormValid}>
        {t('settings.currency.save')}
      </Button>
    </form>
  );
};
