import { Link } from 'react-router-dom';
import { useUnit } from 'effector-react/effector-react.umd';

import { Icon, BodyText, Plate, FootnoteText, HelpText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Paths } from '@renderer/app/providers';
import { cnTw } from '@renderer/shared/lib/utils';
import { currencyModel } from '@renderer/entities/currency';

// TODO: Language switcher temporary removed
export const GeneralActions = () => {
  const { t } = useI18n();
  const currency = useUnit(currencyModel.$currency);

  // const localeOptions: DropdownOption[] = locales.map((option) => ({
  //   id: option.value,
  //   value: option.value,
  //   element: (
  //     <>
  //       <Icon className="rounded-full border border-white" name={option.value} size={20} />
  //       {option.label}
  //     </>
  //   ),
  // }));

  // const selectedLocale = localeOptions.find((option) => option.value === locale);

  // const onLocaleChange = async (data: DropdownResult<SupportedLocale>) => {
  //   try {
  //     await changeLocale(data.value);
  //   } catch (error) {
  //     console.warn(error);
  //   }
  // };

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.overview.generalLabel')}</FootnoteText>

      {/*<li className="flex items-center gap-x-2.5 w-full p-[15px] text-neutral-variant bg-white rounded-2lg shadow-surface">*/}
      {/*  <Icon name="language" />*/}
      {/*  <p className="font-semibold text-base">{t('settings.overview.languageLabel')}</p>*/}
      {/*  <Dropdown*/}
      {/*    className="ml-auto w-[200px]"*/}
      {/*    weight="md"*/}
      {/*    placeholder={t('dropdown.chooseOptionLabel')}*/}
      {/*    activeId={selectedLocale?.id}*/}
      {/*    options={localeOptions}*/}
      {/*    onChange={onLocaleChange}*/}
      {/*  />*/}
      {/*</li>*/}
      <Plate className="p-0">
        <Link
          to={Paths.NETWORK}
          className={cnTw(
            'w-full grid grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 p-3 rounded-md',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="row-span-2" name="network" size={36} />
          <BodyText>{t('settings.overview.networkLabel')}</BodyText>
          <HelpText className="text-text-tertiary">{t('settings.overview.networkDetailsLabel')}</HelpText>
        </Link>
      </Plate>

      <Plate className="p-0">
        <Link
          to={Paths.CURRENCY}
          className={cnTw(
            'w-full flex items-center gap-x-2 p-3 rounded',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="row-span-2" name="network" size={36} />
          <BodyText>{t('settings.currency.plateTitle')}</BodyText>
          {currency && <FootnoteText className="text-text-tertiary ml-auto">{currency.code}</FootnoteText>}
        </Link>
      </Plate>
    </div>
  );
};
