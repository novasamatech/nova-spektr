import { render, screen } from '@testing-library/react';

import EmptyContacts from './EmptyContacts';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/AddressBook/components/EmptyState/EmptyContacts.tsx', () => {
  test('should render component', () => {
    const onAddContactSpy = jest.fn();

    render(<EmptyContacts onAddContact={onAddContactSpy} />);

    const label = screen.getByText('addressBook.contactList.noContactsLabel');
    const button = screen.getByText('addressBook.contactList.noContactsButton');

    expect(label).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
