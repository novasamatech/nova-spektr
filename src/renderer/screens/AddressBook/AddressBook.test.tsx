import { render, screen } from '@testing-library/react';

import AddressBook from './AddressBook';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    getLiveContacts: () => [],
  }),
}));

jest.mock('./components/ContactModal', () => () => <div>ContactModal</div>);

describe('screen/AddressBook', () => {
  test('should render component', () => {
    render(<AddressBook />);

    const text = screen.getByText('addressBook.title');
    expect(text).toBeInTheDocument();
  });
});
