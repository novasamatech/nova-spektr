import { render, screen } from '@testing-library/react';

import FallbackScreen from './FallbackScreen';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('FallbackScreen', () => {
  test('should render component', () => {
    render(<FallbackScreen />);

    const logo = screen.getByTestId('logo-img');
    expect(logo).toBeInTheDocument();

    const message = screen.getByText('fallbackScreen.message');
    expect(message).toBeInTheDocument();

    const button = screen.getByText('fallbackScreen.reloadButton');
    expect(button).toBeInTheDocument();
  });
});
