import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Overview } from './Overview';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => 'outlet',
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    getLiveContacts: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('./components', () => ({
  EmptyContacts: () => <span>emptyContacts</span>,
  ContactList: () => <span>contactList</span>,
}));

describe('screen/AddressBook/Overview', () => {
  test('should render component', () => {
    render(<Overview />, { wrapper: MemoryRouter });

    const text = screen.getByText('addressBook.title');
    expect(text).toBeInTheDocument();
  });
});
