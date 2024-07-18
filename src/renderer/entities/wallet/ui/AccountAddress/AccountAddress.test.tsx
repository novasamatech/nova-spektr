import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNTS, TEST_ADDRESS } from '@shared/lib/utils';

import { AccountAddress } from './AccountAddress';

describe('ui/AccountAddress', () => {
  test('should render component', () => {
    render(<AccountAddress accountId={TEST_ACCOUNTS[0]} addressPrefix={0} />);

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<AccountAddress type="short" accountId={TEST_ACCOUNTS[0]} addressPrefix={0} />);

    const shortAddress = TEST_ADDRESS.slice(0, 8) + '...' + TEST_ADDRESS.slice(TEST_ADDRESS.length - 8);

    const formattedAddress = screen.getByText(shortAddress);
    expect(formattedAddress).toBeInTheDocument();
  });
});
