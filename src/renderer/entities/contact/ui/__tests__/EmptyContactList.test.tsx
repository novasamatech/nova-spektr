import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { EmptyContactList } from '../EmptyContactList';

jest.mock('@app/providers', () => ({
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
