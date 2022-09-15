import { ReactNode } from 'react';

import { Button, Icon } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';

const CONNECTION_VARIANTS: Record<ConnectionStatus, (type: ConnectionType, nodeUrl: string) => ReactNode> = {
  [ConnectionStatus.NONE]: () => null,
  [ConnectionStatus.ERROR]: (type: ConnectionType, nodeUrl: string) => (
    <div className="flex items-center gap-x-1">
      <Icon className="text-error border border-error rounded-full bg-white p-[1px]" name="checkmark" size={12} />
      <p className="text-xs font-semibold text-neutral-variant">
        {type === ConnectionType.LIGHT_CLIENT && 'Light client'}
        {type === ConnectionType.RPC_NODE && nodeUrl}
      </p>
    </div>
  ),
  [ConnectionStatus.CONNECTED]: (type: ConnectionType, nodeUrl: string) => (
    <div className="flex items-center gap-x-1">
      <Icon className="text-success border border-success rounded-full bg-white p-[1px]" name="checkmark" size={12} />
      <p className="text-xs font-semibold text-neutral-variant">
        {type === ConnectionType.LIGHT_CLIENT && 'Connected'}
        {type === ConnectionType.RPC_NODE && nodeUrl}
      </p>
    </div>
  ),
  [ConnectionStatus.CONNECTING]: () => (
    <div className="flex items-center gap-x-1">
      <Icon className="text-shade-30 animate-spin" name="loader" size={14} />
      <p className="text-xs font-semibold text-shade-30">Connecting...</p>
    </div>
  ),
};

type Props = {
  networkItem: ExtendedChain;
};

const NetworkItem = ({ networkItem }: Props) => {
  const { connectToNetwork } = useNetworkContext();

  const { chainId, icon, name, connection } = networkItem;
  const { connectionType, connectionStatus, activeNode } = connection;

  const connect = async () => {
    try {
      await connectToNetwork(networkItem.chainId, ConnectionType.RPC_NODE, {
        url: 'wss://westmint-rpc.polkadot.io',
        name: 'Parity node',
      });
    } catch (error) {
      console.warn(error);
    }
  };

  // TODO: Implement in future
  const disconnect = async () => {
    console.info('disconnect');
    //   try {
    //     await disconnectFromNetwork(networkItem.chainId);
    //   } catch (error) {
    //     console.warn(error);
    //   }
  };

  const onChangeConnection = async () => {
    const isConnected = connectionType !== ConnectionType.DISABLED && connectionStatus !== ConnectionStatus.NONE;

    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <li key={chainId} className="flex items-center gap-x-2.5 px-[15px] py-3 border-b border-shade-5 last:border-b-0">
      <img src={icon} alt="" width={34} height={34} />
      <div className="flex flex-col mr-auto">
        <p className="text-xl leading-5 text-neutral">{name}</p>
        {CONNECTION_VARIANTS[connectionStatus](connectionType, activeNode?.url || '')}
      </div>
      {/* TODO: create custom DropDown */}
      <Button variant="outline" pallet="primary" onClick={onChangeConnection}>
        Westmint RPC test
      </Button>
    </li>
  );
};

export default NetworkItem;
