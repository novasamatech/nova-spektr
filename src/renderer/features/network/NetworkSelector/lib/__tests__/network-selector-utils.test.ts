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
    customNodes: [],
  },
};

describe('features/network/NetworkSelector/lib/network-selector-utils', () => {
  test('should return correct ConnectionList array for defaultNetwork', () => {
    const expected = [
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      {
        type: ConnectionType.RPC_NODE,
        node: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
        isCustom: false,
      },
    ];
    expect(networkSelectorUtils.getConnectionsList(defaultNetwork)).toEqual(expected);
  });

  test('should return light client option', () => {
    const nodeList = networkSelectorUtils.getConnectionsList({
      ...defaultNetwork,
      connection: { ...defaultNetwork.connection, canUseLightClient: true },
    });
    const expected = [
      { type: ConnectionType.LIGHT_CLIENT },
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      {
        type: ConnectionType.RPC_NODE,
        node: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
        isCustom: false,
      },
    ];
    expect(nodeList).toEqual(expected);
  });

  test('should return custom node', () => {
    const nodeList = networkSelectorUtils.getConnectionsList({
      ...defaultNetwork,
      connection: { ...defaultNetwork.connection, customNodes: [{ url: 'wss://custom.io', name: 'node' }] },
    });
    const expected = [
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      {
        type: ConnectionType.RPC_NODE,
        node: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
        isCustom: false,
      },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://custom.io', name: 'node' }, isCustom: true },
    ];
    expect(nodeList).toEqual(expected);
  });

  test('should return false if for canDeleteNode if node is selected', () => {
    expect(
      networkSelectorUtils.canDeleteNode('wss://westend-rpc.polkadot.io', 'wss://westend-rpc.polkadot.io'),
    ).toEqual(false);
  });
  test('should return true if for canDeleteNode if node is  not selected', () => {
    expect(networkSelectorUtils.canDeleteNode('wss://westend-rpc.polkadot.io', 'wss://node-rpc.polkadot.io')).toEqual(
      true,
    );
  });
});
