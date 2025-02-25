import { type HexString, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { basketOperationsService } from './service';

describe('basketOperationsService', () => {
  test('should get core tx from basket operation', () => {
    const neededCoreTx = {
      chainId: '0x00' as HexString,
      address: '0x00',
      type: TransactionType.TRANSFER,
      args: {},
    };

    const basketTx = {
      id: 0,
      initiatorAccountId: '0x00' as AccountId,
      coreTx: neededCoreTx,
      txWrappers: [],
      createdAt: Date.now(),
    };

    const coreTx = basketOperationsService.getCoreTx(basketTx);

    expect(coreTx).toEqual(neededCoreTx);
  });
});
