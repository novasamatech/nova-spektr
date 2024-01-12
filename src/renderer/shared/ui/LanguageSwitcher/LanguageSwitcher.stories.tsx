import { ComponentMeta, ComponentStory } from '@storybook/react';
import { enGB } from 'date-fns/locale';

import { LanguageItem } from '@shared/api/translation/lib/types';
import { LanguageSwitcher } from './LanguageSwitcher';

const languages: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    dateLocale: enGB,
  },
];

export default {
  title: 'LanguageSwitcher',
  component: LanguageSwitcher,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof LanguageSwitcher>;

const Template: ComponentStory<typeof LanguageSwitcher> = (args) => (
  <div className="w-60">
    <LanguageSwitcher {...args} />
  </div>
);

export const BottomFull = Template.bind({});
BottomFull.args = {
  languages,
  selected: 'en',
};

export const TopShort = Template.bind({});
TopShort.args = {
  className: 'w-16 pt-8',
  languages,
  top: true,
  short: true,
  selected: 'ru',
};
