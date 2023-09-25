import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { Switch, FootnoteText, HelpText, Button } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { GroupedSelect } from '@renderer/shared/ui/Dropdowns/GroupedSelect/GroupedSelect';
import { DropdownOption, DropdownOptionGroup } from '@renderer/shared/ui/Dropdowns/common/types';
import { CurrencyItem } from '@renderer/shared/api/price-provider';
import { Callbacks, currencyFormModel } from '../model/currency-form';

const getCurrencyOption = (currency: CurrencyItem): DropdownOption<CurrencyItem> => ({
  id: currency.id.toString(),
  value: currency,
  element: [currency.code, currency.symbol, currency.name].filter(Boolean).join(' • '),
});

type Props = Callbacks;
export const CurrencyForm = ({ onSubmit }: Props) => {
  const { t } = useI18n();

  useEffect(() => {
    currencyFormModel.events.callbacksChanged({ onSubmit });
  }, [onSubmit]);

  const {
    submit,
    fields: { fiatFlag, currency },
  } = useForm(currencyFormModel.$currencyForm);

  const cryptoCurrencies = useUnit(currencyFormModel.$cryptoCurrencies);
  const popularFiatCurrencies = useUnit(currencyFormModel.$popularFiatCurrencies);

  const unpopularFiatCurrencies = useUnit(currencyFormModel.$unpopularFiatCurrencies);

  const currenciesGroups: DropdownOptionGroup<CurrencyItem>[] = [
    {
      id: 'crypto',
      label: t('settings.currency.cryptocurrenciesLabel'),
      options: cryptoCurrencies.map(getCurrencyOption),
    },
    {
      id: 'populat',
      label: t('settings.currency.popularFiatLabel'),
      options: popularFiatCurrencies.map(getCurrencyOption),
    },
    {
      id: 'unpopular',
      label: t('settings.currency.unpopularFiatLabel'),
      options: unpopularFiatCurrencies.map(getCurrencyOption),
    },
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

      <GroupedSelect
        placeholder={t('settings.currency.selectPlaceholder')}
        disabled={!fiatFlag?.value}
        selectedId={currency?.value.toString()}
        optionsGroups={currenciesGroups}
        onChange={({ value }) => currency?.onChange(value.id)}
      />

      <Button className="w-fit ml-auto" type="submit">
        {t('settings.currency.save')}
      </Button>
    </form>
  );
};
