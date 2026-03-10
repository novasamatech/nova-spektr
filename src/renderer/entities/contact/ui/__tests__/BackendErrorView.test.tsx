import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { type BackendErrorCategory } from '../BackendErrorView';
import { BackendErrorView } from '../BackendErrorView';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('entities/contact/ui/BackendErrorView', () => {
  test.each<[BackendErrorCategory, string]>([
    ['auth', 'addressBook.sources.errorAuth'],
    ['forbidden', 'addressBook.sources.errorForbidden'],
    ['timeout', 'addressBook.sources.errorTimeout'],
    ['network', 'addressBook.sources.errorNetwork'],
    ['generic', 'addressBook.sources.errorGeneric'],
  ])('should render correct i18n key for %s category', (category, expectedKey) => {
    render(<BackendErrorView category={category} message="some error" onRetry={vi.fn()} />);

    expect(screen.getByText(expectedKey)).toBeInTheDocument();
    expect(screen.getByText('some error')).toBeInTheDocument();
  });

  test('should call onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<BackendErrorView category="generic" message="Error" onRetry={onRetry} />);

    await userEvent.click(screen.getByText('addressBook.sources.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
