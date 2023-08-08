import { render, screen } from '@testing-library/react';

import { EmptyFilteredContacts } from './EmptyFilteredContacts';

jest.mock('@renderer/app/providers', () => ({
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
