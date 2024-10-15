import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { type CurrencyItem } from '@/shared/api/price-provider';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, HelpText, Select, Switch } from '@/shared/ui';
import { type DropdownOption } from '@/shared/ui/types';
import { type Callbacks, currencyFormModel } from '../model/currency-form';

const getCurrencyOption = (currency: CurrencyItem): DropdownOption<CurrencyItem> => ({
  id: currency.id.toString(),
  value: currency,
  element: [currency.code, currency.symbol, currency.name].filter(Boolean).join(' • '),
});

type Props = Callbacks;
export const CurrencyForm = ({ onSubmit }: Props) => {
  const { t } = useI18n();
  const isFormValid = useUnit(currencyFormModel.$isFormValid);

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

  const cryptoCurrencies = useUnit(currencyFormModel.$cryptoCurrencies);
  const popularFiatCurrencies = useUnit(currencyFormModel.$popularFiatCurrencies);
  const unpopularFiatCurrencies = useUnit(currencyFormModel.$unpopularFiatCurrencies);

  const currenciesOptions: DropdownOption<CurrencyItem>[] = [
    {
      id: 'crypto',
      element: <HelpText className="text-text-secondary">{t('settings.currency.cryptocurrenciesLabel')}</HelpText>,
      value: {} as CurrencyItem,
      disabled: true,
    },
    ...cryptoCurrencies.map(getCurrencyOption),
    {
      id: 'popular',
      element: <HelpText className="text-text-secondary">{t('settings.currency.popularFiatLabel')}</HelpText>,
      value: {} as CurrencyItem,
      disabled: true,
    },
    ...popularFiatCurrencies.map(getCurrencyOption),
    {
      id: 'unpopular',
      element: <HelpText className="text-text-secondary">{t('settings.currency.unpopularFiatLabel')}</HelpText>,
      value: {} as CurrencyItem,
      disabled: true,
    },
    ...unpopularFiatCurrencies.map(getCurrencyOption),
  ];

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
        disabled={!fiatFlag?.value}
        options={currenciesOptions}
        selectedId={currency?.value.toString()}
        onChange={({ value }) => currency?.onChange(value.id)}
      />

      <Button className="ml-auto w-fit" type="submit" disabled={!isFormValid}>
        {t('settings.currency.save')}
      </Button>
    </form>
  );
};
