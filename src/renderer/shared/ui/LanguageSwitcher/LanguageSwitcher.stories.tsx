// TODO: Right now we don't fully support i18n

import type { Meta, StoryObj } from '@storybook/react';
import { enGB, ru } from 'date-fns/locale';
import noop from 'lodash/noop';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
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
  title: 'Design system/LanguageSwitcher',
  component: LanguageSwitcher,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof LanguageSwitcher>;

export const Playground: Story = {
  args: {
    languages,
    selected: 'en',
  },
};

export const TopShort: Story = {
  render: () => (
    <LanguageSwitcher className="w-16 pt-8" languages={languages} top short selected="ru" onChange={noop} />
  ),
};
