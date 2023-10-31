import { render, screen } from '@testing-library/react';

import { Countdown } from './Countdown';

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

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Countdown', () => {
  test('should render component', () => {
    render(<Countdown countdown={10} />);

    const title = screen.getByText('signing.qrCountdownTitle');
    expect(title).toBeInTheDocument();

    const timer = screen.getByText('0:10');
    expect(timer).toBeInTheDocument();
  });
});
