import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { FallbackScreen } from './FallbackScreen';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/FallbackScreen', () => {
  test('should render component', async () => {
    render(<FallbackScreen />);

    await waitFor(() => expect(screen.getByTestId('Graphics:computer')).toBeInTheDocument());

    const message = screen.getByText('fallbackScreen.message');
    expect(message).toBeInTheDocument();

    const button = screen.getByText('fallbackScreen.reloadButton');
    expect(button).toBeInTheDocument();
  });
});
