import { useChains } from '../chainsService';
import chains from '../common/chains.json';

describe('service/network', () => {
  test('should init', () => {
    const params = useChains();

    expect(params.getChainsData).toBeDefined();
  });

  test('should provide data', async () => {
    const { getChainsData } = useChains();
    const data = await getChainsData();

    expect(data).toEqual(chains);
  });
});
