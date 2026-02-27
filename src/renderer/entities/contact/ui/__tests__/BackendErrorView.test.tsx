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
  test('should render Alert with error message and retry button', () => {
    const onRetry = vi.fn();
    render(<BackendErrorView error="Network error" onRetry={onRetry} />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('addressBook.sources.retry')).toBeInTheDocument();
  });

  test('should show network error message for fetch errors', () => {
    render(<BackendErrorView error="Failed to fetch" onRetry={vi.fn()} />);

    expect(screen.getByText('addressBook.sources.errorNetwork')).toBeInTheDocument();
  });

  test('should show auth error message for 401 errors', () => {
    render(<BackendErrorView error="401 Unauthorized" onRetry={vi.fn()} />);

    expect(screen.getByText('addressBook.sources.errorAuth')).toBeInTheDocument();
  });

  test('should show timeout error message for timeout errors', () => {
    render(<BackendErrorView error="Request timed out" onRetry={vi.fn()} />);

    expect(screen.getByText('addressBook.sources.errorTimeout')).toBeInTheDocument();
  });

  test('should show generic error for unknown errors', () => {
    render(<BackendErrorView error="Something unexpected" onRetry={vi.fn()} />);

    expect(screen.getByText('addressBook.sources.errorGeneric')).toBeInTheDocument();
  });

  test('should call onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<BackendErrorView error="Error" onRetry={onRetry} />);

    await userEvent.click(screen.getByText('addressBook.sources.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
