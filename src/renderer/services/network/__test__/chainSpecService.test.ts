import { useChainSpec } from '../chainSpecService';
import statemine from '../chainSpecs/kusama-statemine.json';

jest.mock('@polkadot/rpc-provider/substrate-connect', () => ({
  WellKnownChain: {
    polkadot: 'polkadot',
  },
}));

describe('service/chainSpec', () => {
  test('should init', () => {
    const params = useChainSpec();

    expect(params.getChainSpec).toBeDefined();
    expect(params.getKnownChain).toBeDefined();
  });

  test('should provide correct known chain id', () => {
    const { getKnownChain } = useChainSpec();
    const polkadot = getKnownChain('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');

    expect(polkadot).toBe('polkadot');
  });

  test('should not provide chain id for incorrect data', () => {
    const { getKnownChain } = useChainSpec();
    const unknown = getKnownChain('0x0000000000000000000000000000000000000000000000000000000000000000');

    expect(unknown).toBeUndefined();
  });

  test('should provide correct chain spec', async () => {
    const { getChainSpec } = useChainSpec();
    const spec = await getChainSpec('0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a');

    expect(spec).toBe(JSON.stringify(statemine));
  });

  test('should provide empty string for incorrect id', async () => {
    const { getChainSpec } = useChainSpec();
    const spec = await getChainSpec('0x0000000000000000000000000000000000000000000000000000000000000000');

    expect(spec).toBe('');
  });
});
