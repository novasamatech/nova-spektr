import { render, screen } from '@testing-library/react';

import Loader from './Loader';

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

describe('ui/Loader', () => {
  test('should render component', () => {
    render(<Loader color="primary" />);

    const icon = screen.getByText('loader.svg');
    expect(icon).toBeInTheDocument();
  });

  test('should spin the loader', () => {
    render(<Loader color="primary" />);

    const icon = screen.getByText('loader.svg');
    expect(icon).toHaveClass('animate-spin');
  });
});
