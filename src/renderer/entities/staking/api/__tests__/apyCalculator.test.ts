import { ApiPromise } from '@polkadot/api';

import { getValidatorsApy } from '../apyCalculator';
import { ApyValidator } from '../../lib/types';

describe('services/staking', () => {
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
      { address: '1', totalStake: '201518287642337753', commission: 0 },
      { address: '2', totalStake: '17885248866374479', commission: 20 },
      { address: '3', totalStake: '23222870418140403', commission: 1 },
      { address: '4', totalStake: '36636488281071686', commission: 1 },
      { address: '5', totalStake: '201546708191976560', commission: 22 },
      { address: '6', totalStake: '19473381214045547', commission: 20 },
      { address: '7', totalStake: '201521525575495849', commission: 0 },
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
      { address: '1', totalStake: '25988353501946770', commission: 10 },
      { address: '2', totalStake: '18515132296275736', commission: 8 },
      { address: '3', totalStake: '19349393721433505', commission: 100 },
      { address: '4', totalStake: '28107199630620499', commission: 0 },
      { address: '5', totalStake: '21338216220340276', commission: 3 },
      { address: '6', totalStake: '31594205163653010', commission: 40 },
      { address: '7', totalStake: '18651950195834053', commission: 100 },
    ];
    const result: number[] = [11.66, 16.73, 0, 11.98, 15.3, 6.39, 0];

    const api = mockApi('288491482448402308');

    const data = await getValidatorsApy(api, validators);

    Object.values(data).forEach((apy, index) => {
      expect(result[index]).toEqual(apy);
    });
  });
});
