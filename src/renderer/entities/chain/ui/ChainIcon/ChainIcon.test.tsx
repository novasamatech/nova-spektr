import { act, render, screen } from '@testing-library/react';

import { ChainIcon } from './ChainIcon';
import { TEST_CHAIN_ICON } from '@renderer/shared/lib/utils';

jest.mock('@renderer/entities/walletConnect', () => ({
  walletConnectModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  getWalletConnectChains: jest.fn(),
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

describe('ui/ChainIcon', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<ChainIcon src={TEST_CHAIN_ICON} />);
    });

    const chainImage = screen.getByRole('img');
    expect(chainImage).toBeInTheDocument();
  });

  // TODO fix test
  // test('should render shimmer if image not loaded', async () => {
  //   await act(async () => {
  //     render(<ChainIcon icon={null} />);
  //   });
  //
  //   const shimmer = await screen.findByTestId('shimmer');
  //   expect(shimmer).toBeInTheDocument();
  // });
});
