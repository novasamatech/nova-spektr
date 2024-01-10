import { render, screen } from '@testing-library/react';
import { ApiPromise } from '@polkadot/api';

import { InitOperation } from '../InitOperation';
import { TEST_ASSET } from '@shared/lib/utils';

jest.mock('@features/operation', () => ({
  OperationFooter: () => 'OperationFooter',
  OperationHeader: () => 'OperationHeader',
}));

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('InitOperation', () => {
  test('renders without errors', () => {
    render(
      <InitOperation
        api={new ApiPromise()}
        chainId={'0x00'}
        network={''}
        asset={TEST_ASSET}
        nativeToken={TEST_ASSET}
        addressPrefix={0}
        onTxChange={() => {}}
        onAccountChange={() => {}}
        onSignatoryChange={() => {}}
        onResult={() => {}}
      />,
    );

    expect(screen.getByText('OperationHeader')).toBeInTheDocument();
  });
});
