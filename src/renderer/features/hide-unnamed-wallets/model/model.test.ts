import { createEvent, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import {
  type MultisigAccount,
  type Wallet,
  AccountNameType,
  AccountType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';

import { hideUnnamedWalletsModel } from './model';

// The model only needs the loading event; keep the wallet-select UI tree out of the test.
vi.mock('@/features/wallet-select', () => ({
  walletSelectUI: { dropdownLoadingChanged: createEvent<boolean>() },
}));

const createMultisig = (id: number, name: string) => {
  const accountId = createAccountId(`hide-unnamed-${id}`);
  const wallet: Omit<Wallet, 'accounts'> = { id, name, type: WalletType.MULTISIG, hiddenReason: null };
  const account: MultisigAccount = {
    id: `multisig-${id}`,
    accountId,
    walletId: id,
    name,
    nameType: AccountNameType.CUSTOM,
    type: 'universal',
    accountType: AccountType.MULTISIG,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    threshold: 1,
    signatories: [{ accountId: createAccountId('signatory'), name: 'Signatory' }],
    createdAt: 0,
  };

  return { wallet, account, accountId };
};

describe('hideUnnamedWalletsModel', () => {
  it('should offer to hide only wallets still carrying their generated address name', () => {
    const userNamed = createMultisig(1, 'Team...Fund');
    const otherUserNamed = createMultisig(2, 'Main...Vault');
    const autoNamed = createMultisig(3, '');
    autoNamed.wallet.name = autoNamed.account.name = toShortAddress(
      toAddress(autoNamed.accountId, { prefix: polkadotChain.addressPrefix }),
      5,
    );

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
        .set(walletModel.__test.$rawWallets, [userNamed.wallet, otherUserNamed.wallet, autoNamed.wallet])
        .set(accounts.__test.$list, [userNamed.account, otherUserNamed.account, autoNamed.account]),
    });

    const visible = scope.getState(hideUnnamedWalletsModel.$visibleAutoNamed);

    expect(visible.map((w) => w.id)).toEqual([autoNamed.wallet.id]);
    expect(scope.getState(hideUnnamedWalletsModel.$mode)).toBe('hide');
  });
});
