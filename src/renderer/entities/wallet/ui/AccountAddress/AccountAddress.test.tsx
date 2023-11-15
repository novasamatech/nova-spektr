import { render, screen } from '@testing-library/react';

import { AccountAddress } from './AccountAddress';
import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@shared/lib/utils';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('ui/AccountAddress', () => {
  test('should render component', () => {
    render(<AccountAddress accountId={TEST_ACCOUNT_ID} addressPrefix={0} />);

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<AccountAddress type="short" accountId={TEST_ACCOUNT_ID} addressPrefix={0} />);

    const shortAddress = TEST_ADDRESS.slice(0, 8) + '...' + TEST_ADDRESS.slice(TEST_ADDRESS.length - 8);

    const formattedAddress = screen.getByText(shortAddress);
    expect(formattedAddress).toBeInTheDocument();
  });
});
