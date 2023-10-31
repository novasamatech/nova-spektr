import { render, screen } from '@testing-library/react';

import Switch from './Switch';

jest.mock('@entities/walletConnect', () => ({
  walletConnectModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  walletConnectUtils: {
    getWalletConnectChains: jest.fn(),
  },
}));
jest.mock('@pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

describe('ui/Switch', () => {
  test('should render component', () => {
    render(<Switch>test label</Switch>);

    const label = screen.getByText('test label');
    expect(label).toBeInTheDocument();
  });
});
