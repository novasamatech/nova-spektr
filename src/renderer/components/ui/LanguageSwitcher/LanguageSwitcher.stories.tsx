import { Meta, StoryFn } from '@storybook/react';
import { enGB, ru } from 'date-fns/locale';

import { LanguageItem } from '@renderer/services/translation/common/types';
import LanguageSwitcher from './LanguageSwitcher';

const languages: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    dateLocale: enGB,
  },
  {
    value: 'ru',
    label: 'Russian',
    shortLabel: 'RU',
    dateLocale: ru,
  },
];

export default {
  title: 'LanguageSwitcher',
  component: LanguageSwitcher,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof LanguageSwitcher>;

const Template: StoryFn<typeof LanguageSwitcher> = (args) => (
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
