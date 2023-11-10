import { render, screen } from '@testing-library/react';

import { DerivedAccount } from './DerivedAccount';
import { KeyType } from '@renderer/shared/core';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

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

describe('ui/RootAccount', () => {
  test('should render component', () => {
    render(<DerivedAccount derivationPath={'//public'} showDerivationPath keyType={KeyType.CUSTOM} />);

    const derivationPathValue = screen.getByText('//public');
    expect(derivationPathValue).toBeInTheDocument();
  });
});
