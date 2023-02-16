import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { SigningType } from '@renderer/domain/shared-kernel';
import { AccountDS } from '@renderer/services/storage';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import Confirmation from './Confirmation';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock(
  '../../components/TransactionInfo/TransactionInfo',
  () =>
    ({ children }: any) =>
      children,
);

describe('screens/Bond/Confirmation', () => {
  const asset = { symbol: 'DOT', precision: 10 } as Asset;
  const accounts = [
    {
      accountId: TEST_ADDRESS,
      name: 'address_1',
      signingType: SigningType.WATCH_ONLY,
    },
    {
      accountId: TEST_ADDRESS,
      name: 'address_2',
      signingType: SigningType.PARITY_SIGNER,
    },
  ] as AccountDS[];

  test('should render component', async () => {
    await act(async () => {
      render(
        <Confirmation
          api={{} as ApiPromise}
          accounts={accounts}
          destination={TEST_ADDRESS}
          stake="123"
          chainId="0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
          validators={[]}
          addressPrefix={0}
          asset={asset}
          onResult={() => {}}
        />,
      );
    });

    const signButton = screen.getByText('staking.confirmation.signButton');
    expect(signButton).toBeInTheDocument();
  });
});
