import { render, screen } from '@testing-library/react';

import { LanguageItem } from '@renderer/services/translation/common/types';
import LanguageSwitcher from './LanguageSwitcher';

const languages: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
  },
  {
    value: 'ru',
    label: 'Russian',
    shortLabel: 'RU',
  },
];

describe('ui/LanguageSwitcher', () => {
  test('should render short component', () => {
    render(<LanguageSwitcher short languages={languages} onChange={() => {}} selected={'ru'} />);

    const label = screen.getByText('RU');
    expect(label).toBeInTheDocument();
  });

  test('should render full component', () => {
    render(<LanguageSwitcher languages={languages} onChange={() => {}} selected={'ru'} />);

    const label = screen.getByText('Russian');
    expect(label).toBeInTheDocument();
  });
});
