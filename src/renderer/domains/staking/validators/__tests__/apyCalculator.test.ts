import { type ApiPromise } from '@polkadot/api';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ApyValidator } from '../../types';
import { getValidatorsApy } from '../service';

describe('apyCalculator', () => {
  const mockApi = (totalIssuance: string) => {
    return {
      query: {
        balances: {
          totalIssuance: jest.fn().mockResolvedValue({
            toString: () => totalIssuance,
          }),
        },
      },
    } as unknown as ApiPromise;
  };

  test('should calculate apy_1', async () => {
    const validators: ApyValidator[] = [
      { accountId: '1' as AccountId, totalStake: '201518287642337753', commission: 0 },
      { accountId: '2' as AccountId, totalStake: '17885248866374479', commission: 20 },
      { accountId: '3' as AccountId, totalStake: '23222870418140403', commission: 1 },
      { accountId: '4' as AccountId, totalStake: '36636488281071686', commission: 1 },
      { accountId: '5' as AccountId, totalStake: '201546708191976560', commission: 22 },
      { accountId: '6' as AccountId, totalStake: '19473381214045547', commission: 20 },
      { accountId: '7' as AccountId, totalStake: '201521525575495849', commission: 0 },
    ];
    const result: number[] = [7.92, 71.36, 68.01, 43.11, 6.17, 65.54, 7.92];

    const api = mockApi('1659849717702888583');

    const data = await getValidatorsApy(api, validators);

    Object.values(data).forEach((apy, index) => {
      expect(result[index]).toEqual(apy);
    });
  });

  test('should calculate apy_2', async () => {
    const validators: ApyValidator[] = [
      { accountId: '1' as AccountId, totalStake: '25988353501946770', commission: 10 },
      { accountId: '2' as AccountId, totalStake: '18515132296275736', commission: 8 },
      { accountId: '3' as AccountId, totalStake: '19349393721433505', commission: 100 },
      { accountId: '4' as AccountId, totalStake: '28107199630620499', commission: 0 },
      { accountId: '5' as AccountId, totalStake: '21338216220340276', commission: 3 },
      { accountId: '6' as AccountId, totalStake: '31594205163653010', commission: 40 },
      { accountId: '7' as AccountId, totalStake: '18651950195834053', commission: 100 },
    ];
    const result: number[] = [11.66, 16.73, 0, 11.98, 15.3, 6.39, 0];

    const api = mockApi('288491482448402308');

    const data = await getValidatorsApy(api, validators);

    Object.values(data).forEach((apy, index) => {
      expect(result[index]).toEqual(apy);
    });
  });
});
