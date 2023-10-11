import { render, screen } from '@testing-library/react';

import BaseModal from './BaseModal';

jest.mock('@renderer/entities/walletConnect', () => ({
  wcModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  getWalletConnectChains: jest.fn(),
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

describe('ui/Modals/BaseModal', () => {
  test('should render component', () => {
    render(
      <BaseModal isOpen onClose={() => {}}>
        <button type="button">ok</button>
      </BaseModal>,
    );

    const button = screen.getByRole('button', { name: 'ok' });
    expect(button).toBeInTheDocument();
  });
});
