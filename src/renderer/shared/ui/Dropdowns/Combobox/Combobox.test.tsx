import { render, screen } from '@testing-library/react';

import Combobox from './Combobox';

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

describe('ui/Combobox/Combobox', () => {
  const options = [
    { id: '0', element: 'label_0', value: '0' },
    { id: '1', element: 'label_1', value: '1' },
  ];
  const defaultProps = {
    placeholder: 'Select option',
    options,
    onChange: () => {},
  };

  test('should render component', () => {
    render(<Combobox {...defaultProps} />);

    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
  });
});
