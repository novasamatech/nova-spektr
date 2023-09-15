import { useState } from 'react';
import { useUnit } from 'effector-react/effector-react.umd';
import { useEvent } from 'effector-react';

import { BaseModal, Button, FootnoteText, HelpText, Switch } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useI18n } from '@renderer/app/providers';
import { DropdownOption, DropdownOptionGroup, DropdownResult } from '@renderer/shared/ui/Dropdowns/common/types';
import { Currency, currencyModel } from '@renderer/entities/currency';
import { GroupedSelect } from '@renderer/shared/ui/Dropdowns/GroupedSelect/GroupedSelect';

const CURRENCiES = require('../temp/mock-currencies.json');

type Props = {
  onClose: () => void;
};

export const SelectCurrencyModal = ({ onClose }: Props) => {
  const savedCurrency = useUnit(currencyModel.$currency)?.coingeckoId;
  const updateCurrency = useEvent(currencyModel.events.updateCurrency);

  const { t } = useI18n();
  const [isOpen, toggleIsOpen] = useToggle(true);
  const [showCurrency, toggleShowCurrency] = useToggle(Boolean(savedCurrency));
  const [selectedCurrency, setSelectedCurrency] = useState<DropdownResult<string> | undefined>(
    savedCurrency ? { id: savedCurrency, value: savedCurrency } : undefined,
  );

  const cryptoCurrencies = CURRENCiES.filter((c: Currency) => c.category === 'crypto');
  const popularFiatCurrencies = CURRENCiES.filter((c: Currency) => c.category === 'fiat' && c.popular);
  const unpopularFiatCurrencies = CURRENCiES.filter((c: Currency) => c.category === 'fiat' && !c.popular);

  const getCurrencyOption = (currency: Currency): DropdownOption<string> => ({
    id: currency.coingeckoId,
    value: currency.coingeckoId,
    element: [currency.code, currency.symbol, currency.name].join(' • '),
  });

  const currenciesGroups: DropdownOptionGroup<string>[] = [
    { label: t('settings.currency.cryptocurrenciesLabel'), options: cryptoCurrencies.map(getCurrencyOption) },
    { label: t('settings.currency.popularFiatLabel'), options: popularFiatCurrencies.map(getCurrencyOption) },
    { label: t('settings.currency.unpopularFiatLabel'), options: unpopularFiatCurrencies.map(getCurrencyOption) },
  ];

  const handleClose = () => {
    toggleIsOpen();
    onClose();
  };

  const saveChanges = () => {
    if (showCurrency && selectedCurrency) {
      updateCurrency(CURRENCiES.find((c: Currency) => c.coingeckoId === selectedCurrency.id));
    } else {
      updateCurrency(null);
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
