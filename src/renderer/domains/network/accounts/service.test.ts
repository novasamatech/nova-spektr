import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';

import { accountsService } from './service';
import { type ChainAccount, type UniversalAccount } from './types';

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
  accountId: createAccountId('2'),
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
};

describe('accounts service', () => {
  it('should check account types', async () => {
    expect(accountsService.isChainAccount(chainAccount)).toEqual(true);
    expect(accountsService.isChainAccount(universalAccount)).toEqual(false);
    expect(accountsService.isUniversalAccount(universalAccount)).toEqual(true);
    expect(accountsService.isUniversalAccount(chainAccount)).toEqual(false);
  });

  it('should filter accounts by chainId', async () => {
    const filtered = accountsService.filterAccountOnChain(
      [chainAccount, kusamaChainAccount, universalAccount],
      polkadotChain,
    );

    expect(filtered).toEqual([chainAccount]);
  });

  it('should filter accounts by chainId', async () => {
    const spy = jest.fn().mockReturnValue(true);
    accountsService.accountAvailabilityOnChainAnyOf.registerHandler({ body: spy, available: () => true });

    const filtered = accountsService.filterAccountOnChain(
      [kusamaChainAccount, chainAccount, universalAccount],
      polkadotChain,
    );

    expect(filtered).toEqual([chainAccount, universalAccount]);
    expect(spy).toBeCalledWith({ account: universalAccount, chain: polkadotChain });

    accountsService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });
});
