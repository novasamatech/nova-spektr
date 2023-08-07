import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ManageContact } from './ManageContact';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useSearchParams: jest.fn().mockReturnValue([new URLSearchParams('id=7')]),
}));

jest.mock('@renderer/entities/contact', () => ({
  useContact: jest.fn().mockReturnValue({
    getContact: jest.fn().mockResolvedValue({
      name: 'Contact',
      address: '123',
      accountId: '0x123',
      matrixId: '@bob:matrix.com',
    }),
  }),
}));

jest.mock('@renderer/components/forms', () => ({
  ContactForm: () => <span>contactForm</span>,
}));

describe('pages/AddressBook/ContactForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    await act(async () => {
      render(<ManageContact />, { wrapper: MemoryRouter });
    });

    const form = screen.getByText('contactForm');
    expect(form).toBeInTheDocument();
  });

  test('should render loader', () => {
    render(<ManageContact />, { wrapper: MemoryRouter });

    const loader = screen.getByText('loader.svg');
    expect(loader).toBeInTheDocument();
  });
});
