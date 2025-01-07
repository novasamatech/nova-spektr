import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { EmptyContactList } from '../EmptyContactList';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('entities/contact/ui/EmptyContactList', () => {
  test('should render component', () => {
    render(<EmptyContactList />, { wrapper: MemoryRouter });

    const label = screen.getByText('addressBook.contactList.noContactsLabel');
    const button = screen.getByText('addressBook.createContact.addContactButton');

    expect(label).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
