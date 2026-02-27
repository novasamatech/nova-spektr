import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { EmptyBackendView } from '../EmptyBackendView';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('entities/contact/ui/EmptyBackendView', () => {
  test('should render empty state with Graphics and description', () => {
    render(<EmptyBackendView />);

    expect(screen.getByText('addressBook.sources.emptyBackend')).toBeInTheDocument();
    expect(screen.getByText('addressBook.sources.emptyBackendDescription')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
