import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FallbackScreen } from './FallbackScreen';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/FallbackScreen', () => {
  test('should render component', () => {
    render(<FallbackScreen />, { wrapper: MemoryRouter });

    const logo = screen.getByTestId('computer-img');
    expect(logo).toBeInTheDocument();

    const message = screen.getByText('fallbackScreen.message');
    expect(message).toBeInTheDocument();

    const button = screen.getByText('fallbackScreen.reloadButton');
    expect(button).toBeInTheDocument();
  });
});
