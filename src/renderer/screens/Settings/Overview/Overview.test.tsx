import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Overview from './Overview';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    locale: 'en',
    locales: [],
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Overview', () => {
  test('should render component', () => {
    render(<Overview />, { wrapper: MemoryRouter });

    const text = screen.getByText('settings.title');
    const settings = screen.getByTestId('settings');
    const settingsLinks = settings.querySelectorAll('a');
    const social = screen.getByTestId('social');
    const socialLinks = social.querySelectorAll('a');

    expect(text).toBeInTheDocument();
    expect(settings).toBeInTheDocument();
    expect(settingsLinks).toHaveLength(2);
    expect(social).toBeInTheDocument();
    expect(socialLinks).toHaveLength(4);
  });

  test('should render app version', () => {
    process.env.VERSION = '1.0.0';
    render(<Overview />, { wrapper: MemoryRouter });

    const text = screen.getByText('V' + process.env.VERSION);
    expect(text).toBeInTheDocument();
  });
});
