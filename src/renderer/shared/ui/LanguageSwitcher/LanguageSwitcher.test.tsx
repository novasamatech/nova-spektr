import { render, screen } from '@testing-library/react';
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

describe('ui/LanguageSwitcher', () => {
  test('should render short component', () => {
    render(<LanguageSwitcher short languages={languages} selected="en" onChange={() => {}} />);

    const label = screen.getByText('EN');
    expect(label).toBeInTheDocument();
  });

  test('should render full component', () => {
    render(<LanguageSwitcher languages={languages} selected="en" onChange={() => {}} />);

    const label = screen.getByText('English');
    expect(label).toBeInTheDocument();
  });

  // test('should render full component', () => {
  //   const changeLanguage = jest.fn();
  //   render(<LanguageSwitcher languages={languages} selected="en" onChange={changeLanguage} />);
  //
  //   const button = screen.getByTestId('language-switcher-button');
  //
  //   act(() => button.click());
  //
  //   const englishButton = screen.getByText('English');
  //   expect(englishButton).toBeInTheDocument();
  //
  //   act(() => englishButton.click());
  //
  //   expect(changeLanguage).toBeCalledWith('en');
  // });
});
