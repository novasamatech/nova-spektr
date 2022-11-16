import { act, render, screen } from '@testing-library/react';

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
    render(<LanguageSwitcher short languages={languages} selected={'ru'} onChange={() => {}} />);

    const label = screen.getByText('RU');
    expect(label).toBeInTheDocument();
  });

  test('should render full component', () => {
    render(<LanguageSwitcher languages={languages} selected={'ru'} onChange={() => {}} />);

    const label = screen.getByText('Russian');
    expect(label).toBeInTheDocument();
  });

  test('should render full component', () => {
    const changeLanguage = jest.fn();
    render(<LanguageSwitcher languages={languages} selected={'ru'} onChange={changeLanguage} />);

    const button = screen.getByTestId('language-switcher-button');

    act(() => button.click());

    const englishButton = screen.getByText('English');
    expect(englishButton).toBeInTheDocument();

    act(() => englishButton.click());

    expect(changeLanguage).toBeCalledWith('en');
  });
});
