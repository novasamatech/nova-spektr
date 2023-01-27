import { Link } from 'react-router-dom';

import { Dropdown, Icon } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import Paths from '@renderer/routes/paths';
import { SupportedLocale } from '@renderer/services/translation/common/types';

const Overview = () => {
  const { t, locale, locales, changeLocale } = useI18n();

  const localeOptions: Option[] = locales.map((option) => ({
    id: option.value,
    value: option.value,
    element: (
      <>
        <Icon className="rounded-full border border-white" name={option.value} size={20} />
        {option.label}
      </>
    ),
  }));

  const selectedLocale = localeOptions.find((option) => option.value === locale);

  const onLocaleChange = async (data: ResultOption<SupportedLocale>) => {
    try {
      await changeLocale(data.value);
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <div className="h-full flex flex-col gap-y-9">
      <h1 className="font-semibold text-2xl text-neutral mt-5 px-5">{t('settings.title')}</h1>

      <section className="flex flex-col items-center mx-auto w-full max-w-[740px] p-5 rounded-2lg bg-shade-2">
        <ul className="flex flex-col gap-y-2.5 w-full" data-testid="settings">
          <li className="flex items-center gap-x-2.5 w-full px-[15px] py-5 text-neutral-variant bg-white rounded-2lg shadow-surface">
            <Icon name="language" />
            <p className="font-semibold text-base">{t('settings.languageLabel')}</p>
            <Dropdown
              className="ml-auto w-[200px]"
              placeholder={t('dropdown.chooseOptionLabel')}
              activeId={selectedLocale?.id}
              options={localeOptions}
              onChange={onLocaleChange}
            />
          </li>
          <li>
            <Link
              to={Paths.NETWORK}
              className="flex items-center gap-x-2.5 w-full px-[15px] py-5 text-neutral-variant bg-white rounded-2lg shadow-surface transition focus:shadow-element hover:shadow-element"
            >
              <Icon name="network" />
              <div>
                <p className="font-semibold text-base">{t('settings.networkLabel')}</p>
                <p className="text-shade-40 text-xs">{t('settings.networkDetailsLabel')}</p>
              </div>
              <Icon className="ml-auto" name="right" />
            </Link>
          </li>
          {/*<li>*/}
          {/*  <Link*/}
          {/*    to={Paths.CREDENTIALS}*/}
          {/*    className="flex items-center gap-x-2.5 w-full px-[15px] py-5 text-neutral-variant bg-white rounded-2lg shadow-surface transition focus:shadow-element hover:shadow-element"*/}
          {/*  >*/}
          {/*    <Icon name="network" />*/}
          {/*    <div>*/}
          {/*      <p className="font-semibold text-base">{t('settings.matrixLabel')}</p>*/}
          {/*      <p className="text-shade-40 text-xs">{t('settings.matrixDetailsLabel')}</p>*/}
          {/*    </div>*/}
          {/*    <Icon className="ml-auto" name="right" />*/}
          {/*  </Link>*/}
          {/*</li>*/}
        </ul>

        <div className="mt-15 mb-7.5">
          <p className="uppercase font-bold text-neutral-variant text-2xs">{t('settings.getInTouchLabel')}!</p>
          <ul className="flex justify-center gap-x-2.5 mt-2.5" data-testid="social">
            <li>
              <a href="https://twitter.com/NovasamaTech" target="_blank" rel="noopener noreferrer">
                <Icon className="text-[#1DA1F2]" name="twitterCutout" size={32} />
              </a>
            </li>
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Icon className="text-[#2BA2DE]" name="telegramCutout" size={32} />
              </a>
            </li>
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Icon className="text-[#E12424]" name="youtubeCutout" size={32} />
              </a>
            </li>
            <li>
              <a href="https://github.com/nova-wallet/" target="_blank" rel="noopener noreferrer">
                <Icon className="text-neutral" name="githubCutout" size={32} />
              </a>
            </li>
          </ul>
        </div>

        <Icon as="img" name="logo" size={60} />
        <p className="mt-2.5 text-shade-30 font-bold text-2xs">V{process.env.VERSION}</p>
      </section>
    </div>
  );
};

export default Overview;
