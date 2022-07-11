import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Main from '../Main';
import { useI18n } from '@renderer/context/I18Context';

jest.mock('@renderer/context/I18Context', () => ({
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

    render(<Main />, { wrapper: MemoryRouter });

    const header = screen.getByText('Change language');
    expect(header).toBeInTheDocument();
  });

  test('should change locale on click', () => {
    const mockLocaleChange = jest.fn();

    (useI18n as jest.Mock).mockReturnValue({
      t: jest.fn(),
      onLocaleChange: mockLocaleChange,
    });

    render(<Main />, { wrapper: MemoryRouter });

    const button = screen.getByRole('button', { name: 'RU' });
    button.click();
    expect(mockLocaleChange).toBeCalledWith('ru');
  });
});
