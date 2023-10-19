import { render, screen } from '@testing-library/react';

import Switch from './Switch';

jest.mock('@renderer/entities/walletConnect', () => ({
  walletConnectModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  getWalletConnectChains: jest.fn(),
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

describe('ui/Switch', () => {
  test('should render component', () => {
    render(<Switch>test label</Switch>);

    const label = screen.getByText('test label');
    expect(label).toBeInTheDocument();
  });
});
