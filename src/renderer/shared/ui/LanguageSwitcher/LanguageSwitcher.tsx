import { Listbox } from '@headlessui/react';

import { type LanguageItem, type SupportedLocale } from '@shared/api/translation/lib/types';
import { cnTw } from '@shared/lib/utils';
import { Icon } from '../Icon/Icon';

type Props = {
  className?: string;
  languages: LanguageItem[];
  onChange: (value: SupportedLocale) => void;
  selected: string;
  short?: boolean;
  top?: boolean;
};

export const LanguageSwitcher = ({ className, languages, selected, short, onChange, top }: Props) => {
  const selectedLanguage = languages.find(({ value }) => value === selected) || languages[0];
  const availableLanguages = languages.filter((l) => l !== selectedLanguage);
  const languagesList = top ? [...availableLanguages, selectedLanguage] : [selectedLanguage, ...availableLanguages];

  return (
    <div className={cnTw('relative', className)}>
      <Listbox value={selectedLanguage.value} onChange={onChange}>
        <Listbox.Button
          className={cnTw(
            'h-7.5 select-none pl-2.5 pr-1',
            'hover:bg-primary hover:text-white',
            'bg-shade-8 text-neutral-variant',
            'flex items-center justify-between gap-x-2.5 rounded-l-full rounded-r-full',
          )}
          data-testid="language-switcher-button"
        >
          {short ? selectedLanguage.shortLabel : selectedLanguage.label}
          <Icon className="rounded-full border border-white" name={selectedLanguage.value} />
        </Listbox.Button>
        <Listbox.Options
          className={cnTw('absolute flex flex-col gap-1', top ? 'bottom-0 top-auto' : 'bottom-auto top-0')}
        >
          {languagesList.map((language) => (
            <Listbox.Option key={language.value} value={language.value}>
              {({ active }) => (
                <div
                  className={cnTw(
                    'h-7.5 w-full cursor-pointer select-none pl-2.5 pr-1',
                    'flex items-center justify-between gap-x-2.5 rounded-l-full rounded-r-full',
                    active ? 'bg-primary text-white' : 'bg-shade-8 text-neutral-variant',
                  )}
                >
                  {short ? language.shortLabel : language.label}
                  <Icon className="rounded-full border border-white" name={language.value} />
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
};
