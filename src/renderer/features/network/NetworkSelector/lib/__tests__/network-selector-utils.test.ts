import { ConnectionStatus, ConnectionType } from '@shared/core';
import { networkSelectorUtils } from '../network-selector-utils';
import { ExtendedChain } from '@/src/renderer/entities/network';

const defaultNetwork: ExtendedChain = {
  addressPrefix: 0,
  specName: 'my_chain',
  assets: [],
  chainId: '0x123',
  icon: '',
  name: '',
  nodes: [{ url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' }],
  connectionStatus: ConnectionStatus.DISCONNECTED,
  connection: {
    id: 0,
    chainId: '0x123',
    canUseLightClient: false,
    connectionType: ConnectionType.AUTO_BALANCE,
    customNodes: [{ url: 'wss://custom.io', name: 'node' }],
  },
};

describe('getConnectionOptions should return correct data', () => {
  test('should return correct connection options', () => {
    const options = networkSelectorUtils.getConnectionOptions(defaultNetwork);
    expect(options.availableNodes).toEqual([
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' } },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://custom.io', name: 'node' } },
    ]);
    expect(options.selectedNode).toEqual({ type: ConnectionType.AUTO_BALANCE });
    expect(options.isCustomNode('wss://custom.io')).toEqual(true);
    expect(options.isCustomNode('http://unknownnode.com')).toEqual(false);
  });

  test('should return light client option', () => {
    const options = networkSelectorUtils.getConnectionOptions({
      ...defaultNetwork,
      connection: { ...defaultNetwork.connection, canUseLightClient: true },
    });
    expect(options.availableNodes).toEqual([
      { type: ConnectionType.LIGHT_CLIENT },
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' } },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://custom.io', name: 'node' } },
    ]);
  });
});
