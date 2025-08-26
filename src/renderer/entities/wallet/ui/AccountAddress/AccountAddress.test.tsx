import { render, screen } from '@testing-library/react';

import { I18Provider } from '@/shared/i18n';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { AccountAddress } from './AccountAddress';

describe('ui/AccountAddress', () => {
  test('should render component', () => {
    render(
      <I18Provider>
        <AccountAddress accountId={TEST_ACCOUNTS[0]} addressPrefix={0} />
      </I18Provider>,
    );

    const addressValue = screen.getByText(TEST_ADDRESS);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(
      <I18Provider>
        <AccountAddress type="short" accountId={TEST_ACCOUNTS[0]} addressPrefix={0} />
      </I18Provider>,
    );

    const shortAddress = TEST_ADDRESS.slice(0, 8) + '...' + TEST_ADDRESS.slice(TEST_ADDRESS.length - 8);

    const formattedAddress = screen.getByText(shortAddress);
    expect(formattedAddress).toBeInTheDocument();
  });
});
