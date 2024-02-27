import { Chain, ConnectionStatus, ConnectionType } from '@shared/core';

export const mockChains: Record<string, Chain> = {
  '0x01': {
    name: 'Test chain 1',
    chainId: '0x01',
  } as unknown as Chain,
  '0x02': {
    name: 'Test chain 2',
    chainId: '0x02',
  } as unknown as Chain,
  '0x03': {
    name: 'Test chain 3',
    chainId: '0x03',
  } as unknown as Chain,
  '0x04': {
    name: 'Test chain 4',
    chainId: '0x04',
  } as unknown as Chain,
};

export const mockConnectionStatuses = {
  '0x01': ConnectionStatus.CONNECTED,
  '0x02': ConnectionStatus.DISCONNECTED,
  '0x03': ConnectionStatus.CONNECTING,
  '0x04': ConnectionStatus.ERROR,
};

export const mockConnections = {
  '0x01': {
    chainId: '0x01',
    customNodes: [],
    connectionType: ConnectionType.AUTO_BALANCE,
    canUseLightClient: true,
    id: 1,
  },
  '0x02': {
    chainId: '0x02',
    customNodes: [],
    connectionType: ConnectionType.DISABLED,
    canUseLightClient: true,
    id: 2,
  },
  '0x03': {
    chainId: '0x03',
    customNodes: [],
    connectionType: ConnectionType.RPC_NODE,
    canUseLightClient: true,
    id: 3,
  },
  '0x04': {
    chainId: '0x04',
    customNodes: [],
    connectionType: ConnectionType.RPC_NODE,
    canUseLightClient: true,
    id: 4,
  },
};
