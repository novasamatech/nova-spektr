import { render, screen } from '@testing-library/react';

import { ProxyAccount } from './ProxyAccount';
import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@shared/lib/utils';
import { ProxyType } from '@entities/proxy';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/AccountAddress', () => {
  test('should render component', () => {
    render(<ProxyAccount accountId={TEST_ACCOUNT_ID} addressPrefix={0} proxyType={ProxyType.Staking} />);

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<ProxyAccount type="short" accountId={TEST_ACCOUNT_ID} addressPrefix={0} proxyType={ProxyType.Staking} />);

    const shortAddress = TEST_ADDRESS.slice(0, 8) + '...' + TEST_ADDRESS.slice(TEST_ADDRESS.length - 8);

    const formattedAddress = screen.getByText(shortAddress);
    expect(formattedAddress).toBeInTheDocument();
  });
});
