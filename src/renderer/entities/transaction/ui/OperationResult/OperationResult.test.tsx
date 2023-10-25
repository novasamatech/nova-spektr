import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { OperationResult } from './OperationResult';

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

jest.mock('@renderer/shared/ui/Animation/Animation', () => ({
  Animation: () => <span>animation</span>,
}));

describe('components/common/OperationResult', () => {
  test('should render component', () => {
    render(
      <OperationResult isOpen title="success" onClose={noop}>
        children
      </OperationResult>,
    );

    const children = screen.getByText('children');
    expect(children).toBeInTheDocument();
  });
});
