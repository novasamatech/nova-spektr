import { render, screen } from '@testing-library/react';

import EmptySearch from './EmptySearch';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/AddressBook/components/EmptyState/EmptySearch.tsx', () => {
  test('should render component', () => {
    render(<EmptySearch />);

    const label = screen.getByText('addressBook.contactList.emptySearchLabel');
    const description = screen.getByText('addressBook.contactList.emptySearchDescription');
    expect(label).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });
});
