import { useUnit } from 'effector-react/effector-react.umd';
import { FormEvent } from 'react';

import { BaseModal, Button, FootnoteText, HelpText, Switch } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useI18n } from '@renderer/app/providers';
import { DropdownOption, DropdownOptionGroup } from '@renderer/shared/ui/Dropdowns/common/types';
import { GroupedSelect } from '@renderer/shared/ui/Dropdowns/GroupedSelect/GroupedSelect';
import { CurrencyItem } from '@renderer/shared/api/price-provider';
import { currencyModel } from '@renderer/entities/price';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { currencyForm } from '@renderer/features/currency';

const getCurrencyOption = (currency: CurrencyItem): DropdownOption<CurrencyItem> => ({
  id: currency.id.toString(),
  value: currency,
  element: [currency.code, currency.symbol, currency.name].filter(Boolean).join(' • '),
});

type Props = {
  onClose: () => void;
};

export const SelectCurrencyModal = ({ onClose }: Props) => {
  const activeCurrency = useUnit(currencyForm.$activeCurrency);
  const fiatFlag = useUnit(currencyForm.$fiatFlag);

  const popularFiatCurrencies = useUnit(currencyModel.$popularFiatCurrencies);
  const cryptoCurrencies = useUnit(currencyModel.$cryptoCurrencies);
  const unpopularFiatCurrencies = useUnit(currencyModel.$unpopularFiatCurrencies);

  const { t } = useI18n();
  const [isOpen, toggleIsOpen] = useToggle(true);

  const currenciesGroups: DropdownOptionGroup<CurrencyItem>[] = [
    { label: t('settings.currency.cryptocurrenciesLabel'), options: cryptoCurrencies.map(getCurrencyOption) },
    { label: t('settings.currency.popularFiatLabel'), options: popularFiatCurrencies.map(getCurrencyOption) },
    { label: t('settings.currency.unpopularFiatLabel'), options: unpopularFiatCurrencies.map(getCurrencyOption) },
  ];

  const handleClose = (submitted?: boolean) => {
    toggleIsOpen();

    if (!submitted) {
      setTimeout(currencyForm.events.resetValues, DEFAULT_TRANSITION);
    }

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const saveChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    currencyForm.events.submitForm();

    handleClose(true);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      closeButton
      contentClass="py-4 px-5"
      panelClass="w-[440px]"
      title={t('settings.currency.modalTitle')}
      onClose={handleClose}
    >
      <form className="flex flex-col gap-y-4" onSubmit={saveChanges}>
        <Switch checked={fiatFlag} className="gap-x-2" onChange={currencyForm.events.fiatFlagChanged}>
          <div className="flex flex-col">
            <FootnoteText>{t('settings.currency.switchLabel')}</FootnoteText>
            <HelpText className="text-text-tertiary">{t('settings.currency.switchHint')}</HelpText>
          </div>
        </Switch>

        <GroupedSelect
          placeholder={t('settings.currency.selectPlaceholder')}
          disabled={!fiatFlag}
          selectedId={activeCurrency.toString()}
          optionsGroups={currenciesGroups}
          onChange={(currency) => currencyForm.events.currencyChanged(currency.value.id)}
        />

        <Button className="w-fit ml-auto" type="submit">
          {t('settings.currency.save')}
        </Button>
      </form>
    </BaseModal>
  );
};
