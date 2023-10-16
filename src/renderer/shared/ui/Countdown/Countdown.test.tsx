import { render, screen } from '@testing-library/react';

import { Countdown } from './Countdown';

jest.mock('@renderer/entities/walletConnect', () => ({
  wcModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  getWalletConnectChains: jest.fn(),
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

describe('ui/Countdown', () => {
  test('should render component', () => {
    render(<Countdown countdown={10} />);

    const timer = screen.getByText('0:10');
    expect(timer).toBeInTheDocument();
  });
});
