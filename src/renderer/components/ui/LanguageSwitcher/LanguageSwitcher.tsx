import { Listbox } from '@headlessui/react';
import cn from 'classnames';

import { LanguageItem, SupportedLocales } from '@renderer/services/translation/common/types';
import Icon from '../Icon/Icon';

type Props = {
  className?: string;
  languages: LanguageItem[];
  onChange: (value: SupportedLocales) => void;
  selected: string;
  short?: boolean;
  top?: boolean;
};

const LanguageSwitcher = ({ className, languages, selected, short, onChange, top }: Props) => {
  const selectedLanguage = languages.find(({ value }) => value === selected) || languages[0];
  const availableLanguages = languages.filter((l) => l !== selectedLanguage);
  const languagesList = top ? [...availableLanguages, selectedLanguage] : [selectedLanguage, ...availableLanguages];

  return (
    <div className={cn('relative', className)}>
      <Listbox value={selectedLanguage.value} onChange={onChange}>
        <Listbox.Button
          className={cn(
            'w-full h-7.5 pr-1 pl-2.5 select-none',
            'hover:bg-primary hover:text-white',
            'bg-shade-5 text-neutral-variant',
            'rounded-l-full rounded-r-full flex justify-between items-center',
          )}
          data-testid="language-switcher-button"
        >
          {short ? selectedLanguage.shortLabel : selectedLanguage.label}{' '}
          <Icon as="svg" className="rounded-full border border-white" name={selectedLanguage.value} />
        </Listbox.Button>
        <Listbox.Options
          className={cn('absolute flex flex-col gap-1 w-full', top ? 'bottom-0 top-auto' : 'top-0 bottom-auto')}
        >
          {languagesList.map((language) => (
            <Listbox.Option key={language.value} value={language.value}>
              {({ active }) => (
                <div
                  className={cn(
                    'w-full h-7.5 pr-1 pl-2.5 cursor-pointer select-none',
                    active ? 'bg-primary text-white' : 'bg-shade-5 text-neutral-variant',
                    'rounded-l-full rounded-r-full  flex justify-between items-center',
                  )}
                >
                  {short ? language.shortLabel : language.label}{' '}
                  <Icon as="svg" className="rounded-full border border-white" name={language.value} />
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
};

export default LanguageSwitcher;
