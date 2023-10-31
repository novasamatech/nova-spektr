import { render, screen } from '@testing-library/react';

import { LabelHelpBox } from './LabelHelpBox';

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

describe('ui/LabelHelpBox', () => {
  test('should render component', () => {
    const label = 'This is simple content';
    render(<LabelHelpBox>{label}</LabelHelpBox>);

    const children = screen.getByText(label);
    expect(children).toBeInTheDocument();
  });
});
