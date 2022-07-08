import { render, screen } from '@testing-library/react';

import Main from '../Main';
import { useI18n } from '@context/I18Context';

jest.mock('@context/I18Context', () => ({
  useI18n: jest.fn(),
}));

describe('Main', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    (useI18n as jest.Mock).mockReturnValue({
      t: jest.fn(),
    });

    render(<Main />);

    const header = screen.getByText('Change language');
    expect(header).toBeInTheDocument();
  });

  test('should change locale on click', () => {
    const mockLocaleChange = jest.fn();

    (useI18n as jest.Mock).mockReturnValue({
      t: jest.fn(),
      onLocaleChange: mockLocaleChange,
    });

    render(<Main />);

    const button = screen.getByRole('button', { name: 'RU' });
    button.click();
    expect(mockLocaleChange).toBeCalledWith('ru');
  });
});
