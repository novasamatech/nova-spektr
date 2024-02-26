import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { ProxyDepositWithLabel } from './ProxyDepositWithLabel';
import type { Asset } from '@shared/core';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@entities/transaction', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getProxyDeposit: jest.fn().mockReturnValue('46'),
  }),
}));

jest.mock('@entities/asset', () => ({ AssetBalance: () => <div>deposit_value</div> }));

describe('entities/transaction/ui/ProxyDepositWithLabel', () => {
  test('should render component', () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;

    render(<ProxyDepositWithLabel api={{} as ApiPromise} asset={asset} />);

    const value = screen.getByText('deposit_value');
    expect(value).toBeInTheDocument();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
  });
});
