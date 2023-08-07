import { Chains } from '@renderer/entities/network/lib/common/constants';
import { useChainSpec } from '../chainSpecService';

jest.mock('@polkadot/rpc-provider/substrate-connect', () => ({
  WellKnownChain: {
    polkadot: 'polkadot',
  },
}));

describe('service/chainSpec', () => {
  test('should init', () => {
    const params = useChainSpec();

    expect(params.getLightClientChains).toBeDefined();
    expect(params.getKnownChain).toBeDefined();
  });

  test('should provide correct known chain id', () => {
    const { getKnownChain } = useChainSpec();
    const polkadot = getKnownChain('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');

    expect(polkadot).toEqual('polkadot');
  });

  test('should not provide chain id for incorrect data', () => {
    const { getKnownChain } = useChainSpec();
    const unknown = getKnownChain('0x0');

    expect(unknown).toBeUndefined();
  });

  test('should get chains supporting Light Client', () => {
    const { getLightClientChains } = useChainSpec();
    const chains = getLightClientChains();
    [Chains.POLKADOT, Chains.KUSAMA].forEach((chain, index) => {
      expect(chains[index]).toEqual(chain);
    });
  });
});
