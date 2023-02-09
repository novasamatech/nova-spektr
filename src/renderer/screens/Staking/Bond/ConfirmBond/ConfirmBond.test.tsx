import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import ConfirmBond from './ConfirmBond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Bond/ConfirmBond', () => {
  const asset = { symbol: 'DOT', precision: 10 } as Asset;

  test('should render component', () => {
    render(
      <ConfirmBond
        api={{} as ApiPromise}
        accounts={[]}
        destination="0x1"
        stake="123"
        chainId="0x123"
        validators={[]}
        addressPrefix={10}
        asset={asset}
        onResult={() => {}}
      />,
    );

    const title = screen.getByText('FINISH CONFIRM');
    expect(title).toBeInTheDocument();
  });
});
