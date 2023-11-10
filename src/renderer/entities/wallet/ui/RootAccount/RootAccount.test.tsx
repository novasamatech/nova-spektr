import { render, screen } from '@testing-library/react';

import { RootAccount } from './RootAccount';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

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
    render(<RootAccount accountId={TEST_ACCOUNT_ID} name="name" />);

    const nameValue = screen.getByText('name');
    expect(nameValue).toBeInTheDocument();
  });
});
