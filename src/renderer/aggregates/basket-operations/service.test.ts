import { type HexString, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { basketOperationsService } from './service';

describe('basketOperationsService', () => {
  test('should get core tx from basket operation', () => {
    const neededCoreTx = {
      chainId: '0x00' as HexString,
      accountId: '0x00' as AccountId,
      type: TransactionType.TRANSFER,
      args: {},
    };

    const basketTx = {
      id: 0,
      initiatorAccountId: '0x00' as AccountId,
      coreTx: neededCoreTx,
      route: [],
      createdAt: Date.now(),
    };

    const coreTx = basketOperationsService.getCoreTx(basketTx);

    expect(coreTx).toEqual(neededCoreTx);
  });
});
