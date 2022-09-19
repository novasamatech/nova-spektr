import { useState } from 'react';
import { Popover, RadioGroup } from '@headlessui/react';
import cn from 'classnames';

import useToggle from '@renderer/hooks/useToggle';
import CustomRpc from '@renderer/screens/Settings/Networks/ConnectionSelector/CustomRpc/CustomRpc';
import { Button, ConfirmModal, Icon } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { RpcNode } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';

const LIGHT_CLIENT_KEY = 'light-client';

type Props = {
  networkItem: ExtendedChain;
};

const Selector = ({ networkItem }: Props) => {
  const { connectToNetwork } = useNetworkContext();
  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();
  const [isConfirmOpen, toggleConfirmModal] = useToggle();

  const { api, connection, nodes } = networkItem;
  const { connectionType, activeNode } = connection;
  const combinedNodes = nodes.concat(connection.customNodes || []);

  const [selectedNode, setSelectedNode] = useState(
    {
      [ConnectionType.DISABLED]: 'Select connection type',
      [ConnectionType.RPC_NODE]: activeNode?.url,
      [ConnectionType.LIGHT_CLIENT]: LIGHT_CLIENT_KEY,
    }[connectionType] || 'Select connection type',
  );

  const isDisabled = connectionType === ConnectionType.DISABLED;

  const changeConnection = (nodeId: string, onClose: () => void) => {
    setSelectedNode(nodeId);
    networkItem.disconnect?.();

    if (nodeId === LIGHT_CLIENT_KEY) {
      selectLightClient();
    }

    const node = combinedNodes.find((n) => n.url === nodeId);
    if (node) {
      selectRpcNode(node);
    }

    onClose?.();
  };

  const selectRpcNode = async (rpcNode: RpcNode) => {
    try {
      await connectToNetwork(networkItem.chainId, ConnectionType.RPC_NODE, rpcNode);
    } catch (error) {
      console.warn(error);
    }
  };

  const disableNetwork = async () => {
    try {
      await networkItem.disconnect?.();
    } catch (error) {
      console.warn(error);
    }
  };

  const selectLightClient = async () => {
    try {
      await connectToNetwork(networkItem.chainId, ConnectionType.LIGHT_CLIENT);
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <>
      <Popover className="relative">
        <Popover.Button
          className={cn(
            'h-10 w-72 rounded-2lg border border-shade-10 flex items-center justify-between px-2.5',
            'text-neutral font-semibold text-sm',
            isDisabled && 'text-shade-30',
          )}
        >
          {{
            [ConnectionType.DISABLED]: 'Select connection type',
            [ConnectionType.RPC_NODE]: activeNode?.name,
            [ConnectionType.LIGHT_CLIENT]: 'Light Client',
          }[connectionType] || ''}

          <Icon name="dropdown" size={20} />
        </Popover.Button>

        <Popover.Panel className="absolute top-0 right-0 z-20 rounded-2lg shadow-surface bg-white border-2 border-shade-10 w-[350px]">
          {({ close }) => (
            <div>
              <div className="flex flex-col max-h-64 overflow-auto mb-5">
                <RadioGroup
                  value={selectedNode}
                  onChange={(value: string) => changeConnection(value, close)}
                  className="divide-y divide-shade-5"
                >
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
                  {combinedNodes.map((node) => (
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
              <div className="ml-2 mb-2">
                <Button
                  pallet="primary"
                  variant="text"
                  className="h-7.5"
                  onClick={toggleCustomRpc}
                  prefixElement={
                    <div className="flex justify-center items-center rounded-full border w-4 h-4 border-primary text-primary">
                      <Icon name="add" size={12} />
                    </div>
                  }
                >
                  Add Custom Node
                </Button>
                {!isDisabled && (
                  <Button
                    onClick={toggleConfirmModal}
                    pallet="error"
                    variant="text"
                    className="h-7.5"
                    prefixElement={<Icon name="disable" size={16} />}
                  >
                    Disable Network
                  </Button>
                )}
              </div>
            </div>
          )}
        </Popover.Panel>
      </Popover>

      <ConfirmModal
        className="w-[350px]"
        isOpen={isConfirmOpen}
        onClose={toggleConfirmModal}
        onConfirm={() => {
          toggleConfirmModal();
          disableNetwork();
        }}
      >
        <h2 className="text-error font-semibold text-xl border-b border-error pb-2.5">Disable network</h2>
        <p className="pt-2.5 pb-5 text-neutral-variant"> You are about to disable {networkItem.name} network</p>
      </ConfirmModal>

      <CustomRpc
        chainId={networkItem.chainId}
        genesisHash={api?.genesisHash.toHex()}
        existingUrls={combinedNodes.map((node) => node.url)}
        isOpen={isCustomRpcOpen}
        onClose={toggleCustomRpc}
      />
    </>
  );
};

export default Selector;
