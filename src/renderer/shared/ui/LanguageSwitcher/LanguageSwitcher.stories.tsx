import type { Meta, StoryObj } from '@storybook/react';
import { enGB, ru } from 'date-fns/locale';

import { LanguageItem } from '@renderer/services/translation/common/types';
import { LanguageSwitcher } from './LanguageSwitcher';

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

const meta: Meta<typeof LanguageSwitcher> = {
  title: 'LanguageSwitcher',
  component: LanguageSwitcher,
};

export default meta;
type Story = StoryObj<typeof LanguageSwitcher>;

export const BottomFull: Story = {
  args: {
    languages,
    selected: 'en',
  },
};

export const TopShort: Story = {
  args: {
    className: 'w-16 pt-8',
    languages,
    top: true,
    short: true,
    selected: 'ru',
  },
};
