import { CryptoType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';

import { multisigOperationService } from './service';

describe('multisig operation service', () => {
  it('should generate SS58 multisig address', () => {
    const multisigAccount = multisigOperationService.getMultisigAccountId(
      [
        toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
        toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'),
        toAccountId('5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'),
      ],
      2,
      CryptoType.SR25519,
    );

    expect(multisigAccount).toEqual(toAccountId('5DjYJStmdZ2rcqXbXGX7TW85JsrW6uG4y9MUcLq2BoPMpRA7'));
  });

  it('should generate evm multisig address', () => {
    const multisigAccount = multisigOperationService.getMultisigAccountId(
      [
        toAccountId('0xC60eFE26b9b92380D1b2c479472323eC35F0f0aB'),
        toAccountId('0x61d8c5647f4181f2c35996c62a6272967f5739a8'),
        toAccountId('0xaCCaCE4056A930745218328BF086369Fbd61c212'),
      ],
      2,
      CryptoType.ETHEREUM,
    );

    expect(multisigAccount).toEqual('0xb4e55b61678623fd5ece9c24e79d6c0532bee057');
  });
});
