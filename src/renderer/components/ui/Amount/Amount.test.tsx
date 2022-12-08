import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import Amount from './Amount';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, params?: any) => `${key} ${params?.value || ''}`,
  }),
}));

describe('components/Amount', () => {
  const balance = '20500000000';
  const asset = {
    assetId: 0,
    name: 'Polkadot',
    symbol: 'DOT',
    precision: 10,
    icon: 'Polkadot.svg',
  } as Asset;

  test('should render component', () => {
    const value = '15.22';

    render(<Amount placeholder="Enter amount" value={value} asset={asset} balance={balance} onChange={() => {}} />);

    const amountLabel = screen.getByText('general.input.amountLabel');
    const transferableLabel = screen.getByText(/general.input.transferableLabel/);
    const assetLabels = screen.getAllByText(asset.symbol);
    const transferableValue = screen.getByText(/2.05/);
    const amountValue = screen.getByDisplayValue(value);
    expect(amountLabel).toBeInTheDocument();
    expect(transferableLabel).toBeInTheDocument();
    expect(assetLabels).toHaveLength(2);
    expect(transferableValue).toBeInTheDocument();
    expect(amountValue).toBeInTheDocument();
  });

  test('should render placeholder', () => {
    render(<Amount placeholder="Enter amount" value="" asset={asset} balance={balance} onChange={() => {}} />);

    const amountValue = screen.getByDisplayValue('');
    const placeholder = screen.getByPlaceholderText('Enter amount');
    expect(amountValue).toBeInTheDocument();
    expect(placeholder).toBeInTheDocument();
  });
});
