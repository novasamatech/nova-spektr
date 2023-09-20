import { useState } from 'react';
import { useUnit } from 'effector-react/effector-react.umd';
import { useEvent } from 'effector-react';

import { BaseModal, Button, FootnoteText, HelpText, Switch } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useI18n } from '@renderer/app/providers';
import { DropdownOption, DropdownOptionGroup, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { GroupedSelect } from '@renderer/shared/ui/Dropdowns/GroupedSelect/GroupedSelect';
import { CurrencyConfig } from '@renderer/shared/api/price-provider';
import { currencyModel, priceProviderModel } from '@renderer/entities/price';

type Props = {
  onClose: () => void;
};

export const SelectCurrencyModal = ({ onClose }: Props) => {
  const activeCurrency = useUnit(currencyModel.$activeCurrency);
  const allCurrencies = useUnit(currencyModel.$currencyConfig);
  const initialShowCurrency = useUnit(priceProviderModel.$fiatFlag);

  const updateCurrency = useEvent(currencyModel.events.currencyChanged);
  const updateFiatFlag = useEvent(priceProviderModel.events.showFiatChanged);

  const { t } = useI18n();
  const [isOpen, toggleIsOpen] = useToggle(true);
  const [showCurrency, toggleShowCurrency] = useToggle(!!initialShowCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState<DropdownResult<number> | undefined>(
    activeCurrency ? { id: activeCurrency.coingeckoId, value: activeCurrency.id } : undefined,
  );

  const cryptoCurrencies = allCurrencies.filter((c: CurrencyConfig) => c.category === 'crypto');
  const popularFiatCurrencies = allCurrencies.filter((c: CurrencyConfig) => c.category === 'fiat' && c.popular);
  const unpopularFiatCurrencies = allCurrencies.filter((c: CurrencyConfig) => c.category === 'fiat' && !c.popular);

  const getCurrencyOption = (currency: CurrencyConfig): DropdownOption<number> => ({
    id: currency.coingeckoId,
    value: currency.id,
    element: [currency.code, currency.symbol, currency.name].filter(Boolean).join(' • '),
  });

  const currenciesGroups: DropdownOptionGroup<number>[] = [
    { label: t('settings.currency.cryptocurrenciesLabel'), options: cryptoCurrencies.map(getCurrencyOption) },
    { label: t('settings.currency.popularFiatLabel'), options: popularFiatCurrencies.map(getCurrencyOption) },
    { label: t('settings.currency.unpopularFiatLabel'), options: unpopularFiatCurrencies.map(getCurrencyOption) },
  ];

  const handleClose = () => {
    toggleIsOpen();
    onClose();
  };

  const saveChanges = () => {
    updateFiatFlag(showCurrency);

    if (showCurrency && selectedCurrency) {
      updateCurrency(selectedCurrency.value);
    }

    handleClose();
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
        <Switch checked={showCurrency} className="gap-x-2" onChange={toggleShowCurrency}>
          <div className="flex flex-col">
            <FootnoteText>{t('settings.currency.switchLabel')}</FootnoteText>
            <HelpText className="text-text-tertiary">{t('settings.currency.switchHint')}</HelpText>
          </div>
        </Switch>

        <GroupedSelect
          placeholder={t('settings.currency.selectPlaceholder')}
          disabled={!showCurrency}
          selectedId={selectedCurrency?.id}
          optionsGroups={currenciesGroups}
          onChange={setSelectedCurrency}
        />

        <Button className="w-fit ml-auto" type="submit" disabled={showCurrency && !selectedCurrency}>
          {t('settings.currency.save')}
        </Button>
      </form>
    </BaseModal>
  );
};
