import { render, screen } from '@testing-library/react';

import AddressBook from './AddressBook';

describe('AddressBook', () => {
  test('should render component', () => {
    render(<AddressBook />);

    const text = screen.getByText('AddressBook');
    expect(text).toBeInTheDocument();
  });
});
