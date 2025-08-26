import { type Meta, type StoryFn } from '@storybook/react-vite';
import { enGB } from 'date-fns/locale/en-GB';

import { shortDateLocaleEnGB } from '@/shared/i18n/lib/constants';
import { type LanguageItem } from '@/shared/i18n/lib/types';

import { LanguageSwitcher } from './LanguageSwitcher';

const languages: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    dateLocale: enGB,
    shortDateLocale: shortDateLocaleEnGB,
  },
];

export default {
  title: 'v1/ui/LanguageSwitcher',
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
