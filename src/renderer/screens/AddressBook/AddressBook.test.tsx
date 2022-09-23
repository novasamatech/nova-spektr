import { render, screen } from '@testing-library/react';

import AddressBook from './AddressBook';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/AddressBook', () => {
  test('should render component', () => {
    render(<AddressBook />);

    const text = screen.getByText('addressBook.title');
    expect(text).toBeInTheDocument();
  });
});
