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
            'w-full h-[30px] pr-1 pl-2.5',
            'hover:bg-primary hover:text-white',
            'bg-shade-5 text-neutral-variant',
            'rounded-l-full rounded-r-full flex justify-between items-center',
          )}
        >
          {short ? selectedLanguage.shortLabel : selectedLanguage.label}{' '}
          <Icon as="svg" className="rounded-full border border-white" name={selectedLanguage.value} />
        </Listbox.Button>
        <Listbox.Options
          className={cn('absolute flex flex-col gap-1 w-full', top ? 'bottom-0 top-auto' : 'top-0 bottom-auto')}
        >
          {languagesList.map((language) => (
            <Listbox.Option
              className={cn(
                'w-full h-[30px] pr-1 pl-2.5 cursor-pointer',
                'hover:bg-primary hover:text-white',
                'bg-shade-5 text-neutral-variant',
                'rounded-l-full rounded-r-full  flex justify-between items-center',
              )}
              key={language.value}
              value={language.value}
            >
              {short ? language.shortLabel : language.label}{' '}
              <Icon as="svg" className="rounded-full border border-white" name={language.value} />
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
};

export default LanguageSwitcher;
