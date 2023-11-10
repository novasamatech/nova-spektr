import { render, screen } from '@testing-library/react';

import { DerivedAccount } from './DerivedAccount';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { KeyType } from '@renderer/shared/core';

jest.mock('@renderer/entities/walletConnect', () => ({
  walletConnectModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  walletConnectUtils: {
    getWalletConnectChains: jest.fn(),
  },
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

describe('ui/RootAccount', () => {
  test('should render component', () => {
    render(<DerivedAccount derivationPath={TEST_ACCOUNT_ID} keyType={KeyType.CUSTOM} />);

    const nameValue = screen.getByText('name');
    expect(nameValue).toBeInTheDocument();
  });
});
