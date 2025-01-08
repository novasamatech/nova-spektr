import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { EmptyFilteredContacts } from '../EmptyFilteredContacts';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('entities/contact/ui/EmptyFilteredContacts', () => {
  test('should render component', () => {
    render(<EmptyFilteredContacts />);

    const label = screen.getByText('addressBook.contactList.emptySearchLabel');
    expect(label).toBeInTheDocument();
  });
});
