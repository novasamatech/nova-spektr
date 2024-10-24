import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { AddressWithName } from './AddressWithName';

describe('ui/Address', () => {
  test('should render component', () => {
    render(<AddressWithName accountId={TEST_ACCOUNTS[0]} addressPrefix={0} />);

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<AddressWithName type="short" accountId={TEST_ACCOUNTS[0]} />);

    const elipsis = screen.getByText('5CGQ7B...VbXyr9');
    expect(elipsis).toBeInTheDocument();
  });
});
