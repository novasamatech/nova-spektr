import { act, render, screen } from '@testing-library/react';

import Select from './Select';

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

describe('ui/Dropdowns/Select', () => {
  const options = [
    { id: '0', element: 'label_0', value: '0' },
    { id: '1', element: 'label_1', value: '1' },
  ];
  const defaultProps = {
    activeId: undefined,
    placeholder: 'Select option',
    onChange: () => {},
    options,
  };

  test('should render component', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    const placeholder = screen.getByText('Select option');
    expect(button).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });

  test('should call onSelected', async () => {
    const spySelected = jest.fn();
    render(<Select {...defaultProps} onChange={spySelected} />);

    const button = screen.getByRole('button');
    await act(() => button.click());

    const option = screen.getByRole('option', { name: options[0].element });
    await act(() => option.click());

    expect(spySelected).toBeCalledWith({ id: options[0].id, value: options[0].value });
  });
});
