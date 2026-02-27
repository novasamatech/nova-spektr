import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { BackendErrorView } from '../BackendErrorView';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('entities/contact/ui/BackendErrorView', () => {
  test('should render error message and retry button', () => {
    const onRetry = vi.fn();
    render(<BackendErrorView error="Network error" onRetry={onRetry} />);

    expect(screen.getByText('addressBook.sources.loadError')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('addressBook.sources.retry')).toBeInTheDocument();
  });

  test('should call onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<BackendErrorView error="Network error" onRetry={onRetry} />);

    await userEvent.click(screen.getByText('addressBook.sources.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
