import { TransactionType } from '@shared/core';
import { TEST_ADDRESS } from '@shared/lib/utils';

import { getIconName } from '../transactionIcon';

describe('entities/transaction/lib/transactionIcon', () => {
  test('should get transfer icon for transfer transaction', () => {
    const iconName = getIconName({
      address: TEST_ADDRESS,
      args: {
        dest: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3',
        value: '1000000000000',
      },
      chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
      method: 'transferKeepAlive',
      section: 'balances',
      type: TransactionType.TRANSFER,
    });

    expect(iconName).toEqual('transferMst');
  });
});
