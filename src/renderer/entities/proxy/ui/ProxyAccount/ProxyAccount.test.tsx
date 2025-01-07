import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { ProxyAccount } from './ProxyAccount';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/AccountAddress', () => {
  test('should render component', () => {
    render(<ProxyAccount accountId={TEST_ACCOUNTS[0]} addressPrefix={0} proxyType="Staking" />);

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<ProxyAccount type="short" accountId={TEST_ACCOUNTS[0]} addressPrefix={0} proxyType="Staking" />);

    const shortAddress = TEST_ADDRESS.slice(0, 8) + '...' + TEST_ADDRESS.slice(TEST_ADDRESS.length - 8);

    const formattedAddress = screen.getByText(shortAddress);
    expect(formattedAddress).toBeInTheDocument();
  });
});
