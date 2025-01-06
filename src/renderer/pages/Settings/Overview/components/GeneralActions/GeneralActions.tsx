import { useUnit } from 'effector-react/effector-react.umd';
import { capitalize } from 'lodash';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { exportDb } from '@/shared/api/storage';
import { useI18n } from '@/shared/i18n';
import { cnTw, isDev } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { BodyText, Button, FootnoteText, HelpText, Icon, Plate, Switch } from '@/shared/ui';
import { governanceModel } from '@/entities/governance';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { downloadFiles } from '@/features/wallets/ExportKeys';

// TODO: Language switcher temporary removed
export const GeneralActions = () => {
  const { t } = useI18n();

  const currency = useUnit(currencyModel.$activeCurrency);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const governanceApi = useUnit(governanceModel.$governanceApi);

  const [isAutoUpdateOn, setIsAutoUpdateOn] = useState(true);

  const isAutoUpdateSupported = window.App && window.App.isAutoUpdateSupported;

  useEffect(() => {
    if (isAutoUpdateSupported) {
      window.App.getIsAutoUpdateEnabled().then(setIsAutoUpdateOn);
    }
  }, []);

  const handleAutoUpdateValueChange = (value: boolean) => {
    window.App.setIsAutoUpdateEnabled(value).then(() => setIsAutoUpdateOn(value));
  };

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

  const exportDatabase = () => {
    exportDb().then((data) => {
      downloadFiles([data]);
    });
  };

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
            'grid w-full grid-flow-col grid-cols-[auto,1fr,auto] items-center gap-x-2 rounded-md p-3',
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
          to={Paths.REFERENDUM_DATA}
          className={cnTw(
            'flex w-full items-center gap-x-2 rounded p-3',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="row-span-2" name="referendum" size={36} />
          <BodyText>{t('settings.overview.referendumLabel')}</BodyText>
          <FootnoteText className="ml-auto text-text-tertiary">{capitalize(governanceApi?.type)}</FootnoteText>
        </Link>
      </Plate>

      <Plate className="p-0">
        <Link
          to={Paths.CURRENCY}
          className={cnTw(
            'flex w-full items-center gap-x-2 rounded p-3',
            'transition hover:shadow-card-shadow focus:shadow-card-shadow',
          )}
        >
          <Icon className="row-span-2" name="currency" size={36} />
          <BodyText>{t('settings.currency.plateTitle')}</BodyText>
          {fiatFlag && <FootnoteText className="ml-auto text-text-tertiary">{currency?.code}</FootnoteText>}
        </Link>
      </Plate>

      {isDev() && (
        <Plate>
          <BodyText className="mb-2 flex items-center justify-center gap-1 text-alert">
            <Icon name="warn" size={12} className="text-inherit" />
            {/* eslint-disable i18next/no-literal-string */}
            <span>DEV MODE</span>
          </BodyText>
          <Button
            pallet="secondary"
            className="w-full border border-alert bg-alert-background-warning"
            onClick={exportDatabase}
          >
            {t('importDB.exportButton')}
          </Button>
        </Plate>
      )}

      {isAutoUpdateSupported && (
        <Plate className="p-0">
          <div className="flex w-full items-center gap-x-2 rounded p-3 transition hover:shadow-card-shadow focus:shadow-card-shadow">
            <Icon className="row-span-2" name="update" size={36} />
            <BodyText className="mr-auto">{t('settings.autoUpdate')}</BodyText>
            <Switch
              checked={isAutoUpdateOn}
              knobClassName="transition-none"
              switchClassName="transition-none"
              onChange={handleAutoUpdateValueChange}
            />
          </div>
        </Plate>
      )}
    </div>
  );
};
