import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { accountService } from './service';
import { type AnyAccount, type ChainAccount, type UniversalAccount } from './types';

const chainAccount: ChainAccount = {
  id: 'chain',
  type: 'chain',
  accountId: createAccountId('1'),
  chainId: polkadotChainId,
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
};

const kusamaChainAccount: ChainAccount = {
  id: 'kusama',
  type: 'chain',
  accountId: createAccountId('2'),
  chainId: kusamaChainId,
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
};

const universalAccount: UniversalAccount = {
  id: 'universal',
  type: 'universal',
  accountId: createAccountId('3'),
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
};

describe('accounts service', () => {
  it('should check account types', async () => {
    expect(accountService.isChainAccount(chainAccount)).toEqual(true);
    expect(accountService.isChainAccount(universalAccount)).toEqual(false);
    expect(accountService.isUniversalAccount(universalAccount)).toEqual(true);
    expect(accountService.isUniversalAccount(chainAccount)).toEqual(false);
  });

  it('should filter accounts by chainId', async () => {
    const filtered = accountService.filterAccountOnChain(
      [chainAccount, kusamaChainAccount, universalAccount],
      polkadotChain,
    );

    expect(filtered).toEqual([chainAccount]);
  });

  it('should filter accounts by chainId', async () => {
    const spy = jest.fn().mockReturnValue(true);
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: spy, available: () => true });

    const filtered = accountService.filterAccountOnChain(
      [kusamaChainAccount, chainAccount, universalAccount],
      polkadotChain,
    );

    expect(filtered).toEqual([chainAccount, universalAccount]);
    expect(spy).toBeCalledWith({ account: universalAccount, chain: polkadotChain });

    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  it('should create graphs', async () => {
    interface NestedAccount extends ChainAccount {
      child: AccountId;
    }

    const isNested = (a: AnyAccount): a is NestedAccount => {
      return 'child' in a;
    };

    const firstNestedAccount: NestedAccount = {
      id: '',
      type: 'chain',
      name: 'test',
      walletId: 0,
      chainId: polkadotChainId,
      accountId: createAccountId('1'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WALLET_CONNECT,
      child: createAccountId('2'),
    };

    const secondNestedAccount: NestedAccount = {
      id: '',
      type: 'chain',
      name: 'test',
      walletId: 1,
      chainId: polkadotChainId,
      accountId: createAccountId('2'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WALLET_CONNECT,
      child: createAccountId('3'),
    };

    const leafAccount: ChainAccount = {
      id: '',
      type: 'chain',
      name: 'test',
      walletId: 2,
      chainId: polkadotChainId,
      accountId: createAccountId('3'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
    };

    const accounts = [leafAccount, secondNestedAccount, firstNestedAccount];

    accountService.accountActionPermissionAnyOf.registerHandler({
      body: () => true,
      available: () => true,
    });
    accountService.accountGraphCollectPipeline.registerHandler({
      body(node, { accounts }) {
        const account = node.account;
        if (isNested(account)) {
          const child = accounts.find(a => a.accountId === account.child);

          if (!child) {
            return node;
          }

          return {
            account,
            children: [
              accountService.accountGraphCollectPipeline(
                {
                  account: child,
                  children: [],
                },
                { accounts },
              ),
            ],
          };
        }

        return node;
      },
      available: () => true,
    });

    const graphs = accountService.createAccountGraphs(accounts, polkadotChain);

    const firstNestedNode = graphs.get(firstNestedAccount);
    const secondNestedNode = graphs.get(secondNestedAccount);
    const childNode = graphs.get(leafAccount);

    assert(firstNestedNode, 'graph should include nested account');
    assert(secondNestedNode, 'graph should include nested account');
    assert(childNode, 'graph should include child account');

    expect(firstNestedNode.children.length).toBe(1);
    expect(secondNestedNode.children.length).toBe(1);
    expect(childNode.children.length).toBe(0);

    expect(accountService.findRoute(firstNestedAccount, leafAccount, accounts, polkadotChain)).toEqual([
      firstNestedAccount,
      secondNestedAccount,
      leafAccount,
    ]);
    expect(accountService.findSignatories(firstNestedAccount, accounts, polkadotChain)).toEqual([leafAccount]);
    expect(accountService.findInitiators(accounts, polkadotChain)).toEqual([firstNestedAccount]);
  });
});
