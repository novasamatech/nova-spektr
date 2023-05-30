import cn from 'classnames';
import { Link } from 'react-router-dom';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Header } from '@renderer/components/common';
import Paths from '@renderer/routes/paths';
import { HelpText } from '@renderer/components/ui-redesign/Typography';

const Links = [
  {
    path: Paths.NETWORK,
    icon: 'network',
    title: 'settings.overview.networkLabel',
    subtitle: 'settings.overview.networkDetailsLabel',
  },
  {
    path: Paths.MATRIX,
    icon: 'chat',
    title: 'settings.overview.matrixLabel',
    subtitle: 'settings.overview.matrixDetailsLabel',
  },
] as const;

// TODO: Language switcher temporary removed
const Overview = () => {
  const { t } = useI18n();

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
    <div className="h-full flex flex-col">
      <Header title={t('settings.title')} />

      <div className="w-full h-full overflow-y-auto bg-main-app-background">
        <section className="flex flex-col w-[546px] mx-auto py-4">
          <ul className="flex flex-col gap-y-2.5 w-full" data-testid="settings">
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
            {Links.map(({ path, icon, title, subtitle }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={cn(
                    'grid grid-flow-col grid-cols-[max-content,1fr,max-content] items-center gap-x-2.5 py-5 px-[15px]',
                    'bg-white rounded-2lg text-neutral-variant shadow-surface transition',
                    'hover:shadow-element focus:shadow-element',
                  )}
                >
                  <Icon className="row-span-2" name={icon} size={30} />
                  <p className="font-semibold text-base">{t(title)}</p>
                  <p className="text-shade-40 text-xs">{t(subtitle)}</p>
                  <Icon className="justify-self-end row-span-2" name="right" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-15 mb-7.5">
            <p className="uppercase font-bold text-center text-neutral-variant text-2xs">
              {t('settings.overview.socialLabel')}
            </p>
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

          <div className="flex flex-col items-center gap-y-4">
            <Icon as="img" name="logo" size={48} />
            <HelpText className="text-text-tertiary">
              {t('settings.overview.versionLabel')} {process.env.VERSION}
            </HelpText>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Overview;
