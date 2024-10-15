import { ConnectionStatus, ConnectionType } from '@/shared/core';

const chains = [
  { name: 'Test chain 1', chainId: '0x01' },
  { name: 'Test chain 2', chainId: '0x02' },
  { name: 'Test chain 3', chainId: '0x03' },
  { name: 'Test chain 4', chainId: '0x04' },
];

const connectionStatuses = {
  '0x01': ConnectionStatus.CONNECTED,
  '0x02': ConnectionStatus.DISCONNECTED,
  '0x03': ConnectionStatus.CONNECTING,
  '0x04': ConnectionStatus.ERROR,
};

const connections = {
  '0x01': { chainId: '0x01', connectionType: ConnectionType.AUTO_BALANCE },
  '0x02': { chainId: '0x02', connectionType: ConnectionType.DISABLED },
  '0x03': { chainId: '0x03', connectionType: ConnectionType.RPC_NODE },
  '0x04': { chainId: '0x04', connectionType: ConnectionType.RPC_NODE },
};

export const networksMock = {
  chains,
  connectionStatuses,
  connections,
};
