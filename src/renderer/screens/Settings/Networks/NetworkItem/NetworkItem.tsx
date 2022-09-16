import { ReactNode, useState } from 'react';
import { Popover, RadioGroup } from '@headlessui/react';
import cn from 'classnames';

import { Button, Icon } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionStatus, ConnectionType, RpcNode } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { RPCNode } from '@renderer/domain/chain';

const LIGHT_CLIENT_KEY = 'light-client';

const NETWORK_CONNECTION_STATUS: Record<ConnectionStatus, (type: ConnectionType, nodeUrl: string) => ReactNode> = {
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

  const { chainId, icon, name, connection, nodes } = networkItem;
  const { connectionType, connectionStatus, activeNode } = connection;

  const [selectedNode, setSelectedNode] = useState(
    connectionType === ConnectionType.RPC_NODE
      ? activeNode?.url
      : connectionType === ConnectionType.LIGHT_CLIENT
      ? LIGHT_CLIENT_KEY
      : '',
  );

  const changeConnection = (nodeId: string) => {
    setSelectedNode(nodeId);

    if (nodeId === LIGHT_CLIENT_KEY) {
      selectLightClient();
    }

    const node = nodes.find((n) => n.url === nodeId);
    if (node) {
      selectRpcNode(node);
    }
  };

  const selectRpcNode = async ({ url, name }: RPCNode) => {
    try {
      await connectToNetwork(networkItem.chainId, ConnectionType.RPC_NODE, {
        url,
        name,
      });
    } catch (error) {
      console.warn(error);
    }
  };

  // TODO: Implement in future
  const disableNetwork = async () => {
    console.info('disconnect');
    //   try {
    //     await disconnectFromNetwork(networkItem.chainId);
    //   } catch (error) {
    //     console.warn(error);
    //   }
  };

  const selectLightClient = async () => {
    try {
      await connectToNetwork(networkItem.chainId, ConnectionType.LIGHT_CLIENT);
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <li key={chainId} className="flex items-center gap-x-2.5 px-[15px] py-3 border-b border-shade-5 last:border-b-0">
      <img src={icon} alt="" width={34} height={34} />
      <div className="flex flex-col mr-auto">
        <p className="text-xl leading-5 text-neutral">{name}</p>
        {NETWORK_CONNECTION_STATUS[connectionStatus](connectionType, activeNode?.url || '')}
      </div>

      <Popover className="relative">
        <Popover.Button
          className={cn(
            'h-10 w-72 rounded-2lg border border-shade-10 flex items-center justify-between px-2.5',
            'text-neutral font-semibold text-sm',
          )}
        >
          {connectionType === ConnectionType.RPC_NODE ? activeNode?.name : 'Light client'}
          <Icon name="dropdown" size={20} />
        </Popover.Button>

        <Popover.Panel className="absolute top-0 right-0 z-20 rounded-2lg shadow-surface bg-white border-2 border-shade-10 w-[350px]">
          <div>
            <div className="flex flex-col max-h-64 overflow-auto divide-y mb-5">
              <RadioGroup value={selectedNode} onChange={changeConnection}>
                <RadioGroup.Option
                  value={LIGHT_CLIENT_KEY}
                  className={cn(
                    'h-10 flex gap-2.5 px-4 box-border cursor-pointer items-center text-sm font-semibold text-neutral hover:bg-shade-2',
                  )}
                >
                  {({ checked }) => (
                    <>
                      <div
                        className={cn(
                          'rounded-full w-5 h-5',
                          checked ? 'border-[6px] border-primary' : 'border-2 border-shade-30',
                        )}
                      ></div>
                      <div>
                        <div className={checked ? 'text-primary' : ''}>Light client</div>
                      </div>
                    </>
                  )}
                </RadioGroup.Option>
                {nodes.map((node) => (
                  <RadioGroup.Option
                    value={node.url}
                    key={node.name}
                    className={cn(
                      'h-10 flex gap-2.5 px-4 box-border cursor-pointer items-center text-sm font-semibold text-neutral hover:bg-shade-2',
                    )}
                  >
                    {({ checked }) => (
                      <>
                        <div
                          className={cn(
                            'rounded-full w-5 h-5',
                            checked ? 'border-[6px] border-primary' : 'border-2 border-shade-30',
                          )}
                        ></div>
                        <div>
                          <div className={checked ? 'text-primary' : ''}>{node.name}</div>
                          <div className={cn('font-semibold text-xs text-neutral-variant')}>{node.url}</div>
                        </div>
                      </>
                    )}
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
            </div>
            <div className="ml-2">
              <Button
                pallet="primary"
                variant="text"
                className="h-7.5"
                prefixElement={
                  <div className="flex justify-center items-center rounded-full border w-4 h-4 border-primary text-primary">
                    <Icon name="add" size={12} />
                  </div>
                }
              >
                Add Custom Node
              </Button>
              <Button
                onClick={disableNetwork}
                pallet="error"
                variant="text"
                className="h-7.5"
                prefixElement={<Icon name="disable" size={16} />}
              >
                Disable Network
              </Button>
            </div>
          </div>
        </Popover.Panel>
      </Popover>
    </li>
  );
};

export default NetworkItem;
