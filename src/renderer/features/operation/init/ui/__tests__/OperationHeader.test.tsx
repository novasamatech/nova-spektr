import { act, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import noop from 'lodash/noop';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { OperationHeader } from '../OperationHeader';
import { TEST_ACCOUNTS, TEST_ADDRESS, TEST_CHAIN_ID } from '@shared/lib/utils';
import type { Account, AccountId, MultisigAccount, Wallet } from '@shared/core';
import { CryptoType, ChainType, AccountType, WalletType, SigningType } from '@shared/core';
import { walletModel } from '@entities/wallet';

const accountProps = {
  id: 1,
  walletId: 1,
  cryptoType: CryptoType.SR25519,
  chainType: ChainType.SUBSTRATE,
};
const SIGNATORY_ACCOUNT_ID: AccountId = '0x0dsfdsf';
const SIGNATORY_ACCOUNT = {
  ...accountProps,
  accountId: SIGNATORY_ACCOUNT_ID,
  name: 'signatory account',
  address: TEST_ADDRESS,
};
const props: Omit<ComponentProps<typeof OperationHeader>, 'accounts' | 'onSignatoryChange' | 'onAccountChange'> = {
  chainId: TEST_CHAIN_ID,
  getAccountOption: (account: Account) => ({ id: account.accountId, value: account, element: account.name }),
  getSignatoryOption: (_: Wallet, account: Account) => ({
    id: account.accountId,
    value: account,
    element: account.name,
  }),
};

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe.skip('features/operation/init/OperationHeader', () => {
  test('should render signatory selector for multisig and select first signatory', async () => {
    const scope = fork({
      values: new Map().set(walletModel.$activeWallet, {
        id: 1,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      }),
    });

    const spySignatoryChange = jest.fn();
    const account = {
      type: AccountType.MULTISIG,
      accountId: TEST_ACCOUNTS[0],
      name: 'multisig account',
      signatories: [SIGNATORY_ACCOUNT],
      threshold: 2,
      matrixRoomId: '123',
      creatorAccountId: '0x00',
      ...accountProps,
    };

    await act(async () => {
      render(
        <Provider value={scope}>
          <OperationHeader
            {...props}
            accounts={[account] as [MultisigAccount]}
            onSignatoryChange={spySignatoryChange}
            onAccountChange={noop}
          />
        </Provider>,
      );
    });

    const signatorySelect = screen.getByTestId('signatory-select');
    expect(signatorySelect).toBeInTheDocument();
    expect(spySignatoryChange).toBeCalledWith(SIGNATORY_ACCOUNT);
  });

  test('should render shard selector for multishard and select first shard', async () => {
    const spyAccountChange = jest.fn();
    const SHARD_ACCOUNT = { ...SIGNATORY_ACCOUNT, walletId: 1, type: AccountType.CHAIN };

    await act(async () => {
      render(
        <OperationHeader
          {...props}
          accounts={[SHARD_ACCOUNT]}
          onSignatoryChange={noop}
          onAccountChange={spyAccountChange}
        />,
      );
    });

    const signatorySelect = screen.getByTestId('shards-select');
    expect(signatorySelect).toBeInTheDocument();
    expect(spyAccountChange).toBeCalledWith(SHARD_ACCOUNT);
  });
});
