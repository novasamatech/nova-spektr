import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { ContactForm } from './ContactForm';
import { Contact } from '@renderer/domain/contact';
import { TEST_ADDRESS, TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/app/providers', () => ({
  useMatrix: jest.fn().mockReturnValue({
    matrix: { validateFullUserName: jest.fn().mockReturnValue(true) },
  }),
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    addContact: jest.fn(),
    updateContact: jest.fn(),
    getContacts: jest.fn().mockResolvedValue([]),
  }),
}));

describe('screens/AddressBook/ContactForm', () => {
  const contact: Contact = {
    name: 'Contact',
    address: TEST_ADDRESS,
    accountId: TEST_ACCOUNT_ID,
    matrixId: '@bob:matrix.com',
  };

  test('should render component', () => {
    render(<ContactForm onFormSubmit={noop} />);

    const inputs = screen.getAllByRole('textbox');
    const button = screen.getByRole('button');

    expect(inputs).toHaveLength(3);
    expect(button).toBeInTheDocument();
  });

  test('should fill all inputs', () => {
    render(<ContactForm contact={contact} onFormSubmit={noop} />);

    const inputs = screen.getAllByRole('textbox');

    expect(inputs[0]).toHaveValue(contact.name);
    expect(inputs[1]).toHaveValue(contact.address);
    expect(inputs[2]).toHaveValue(contact.matrixId);
  });
});
