import { act, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import noop from 'lodash/noop';

import { OperationHeader } from '../OperationHeader';
import { TEST_ACCOUNT_ID, TEST_ADDRESS, TEST_CHAIN_ID } from '@renderer/shared/lib/utils';
import { AccountId, ChainType, CryptoType } from '@renderer/domain/shared-kernel';
import { Account } from '@renderer/entities/account';
import { SigningType } from '@renderer/entities/wallet';

const accountProps = {
  signingType: SigningType.PARITY_SIGNER,
  cryptoType: CryptoType.SR25519,
  chainType: ChainType.SUBSTRATE,
  isMain: true,
  isActive: true,
};
const SIGNATORY_ACCOUNT_ID: AccountId = '0x0dsfdsf';
const SIGNATORY_ACCOUNT = {
  accountId: SIGNATORY_ACCOUNT_ID,
  name: 'signatory account',
  ...accountProps,
  address: TEST_ADDRESS,
};
const props: Omit<ComponentProps<typeof OperationHeader>, 'accounts' | 'onSignatoryChange' | 'onAccountChange'> = {
  chainId: TEST_CHAIN_ID,
  getAccountOption: (account: Account) => ({ id: account.accountId, value: account, element: account.name }),
  getSignatoryOption: (account: Account) => ({ id: account.accountId, value: account, element: account.name }),
};

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/account', () => ({
  ...jest.requireActual('@renderer/entities/account'),
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [SIGNATORY_ACCOUNT],
  }),
}));

describe('features/operation/init/OperationHeader', () => {
  test('should render signatory selector for multisig and select first signatory', async () => {
    const spySignatoryChange = jest.fn();

    await act(async () => {
      render(
        <OperationHeader
          {...props}
          accounts={[
            {
              accountId: TEST_ACCOUNT_ID,
              name: 'multisig account',
              ...accountProps,
              signatories: [SIGNATORY_ACCOUNT],
              threshold: 2,
              matrixRoomId: '123',
              creatorAccountId: '0x0',
            },
          ]}
          onSignatoryChange={spySignatoryChange}
          onAccountChange={noop}
        />,
      );
    });
    // render(<OperationHeader {...props} onSignatoryChange={spySignatoryChange} />);

    const signatorySelect = screen.getByTestId('signatory-select');
    expect(signatorySelect).toBeInTheDocument();
    expect(spySignatoryChange).toBeCalledWith(SIGNATORY_ACCOUNT);
  });

  test('should render shard selector for multishard and select first shard', async () => {
    const spyAccountChange = jest.fn();
    const SHARD_ACCOUNT = { ...SIGNATORY_ACCOUNT, walletId: '1' };

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
    // render(<OperationHeader {...props} onSignatoryChange={spySignatoryChange} />);

    const signatorySelect = screen.getByTestId('shards-select');
    expect(signatorySelect).toBeInTheDocument();
    expect(spyAccountChange).toBeCalledWith(SHARD_ACCOUNT);
  });
});
