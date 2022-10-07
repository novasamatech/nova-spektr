import { Popover, RadioGroup } from '@headlessui/react';
import cn from 'classnames';
import { MouseEvent, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button, Icon } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { RpcNode } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import useToggle from '@renderer/hooks/useToggle';
import CustomRpcModal from '@renderer/screens/Settings/Networks/ConnectionSelector/CustomRpcModal/CustomRpcModal';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useConfirmContext } from '@renderer/context/ConfirmContext';

const LIGHT_CLIENT_KEY = 'light-client';

type Props = {
  networkItem: ExtendedChain;
};

const Selector = ({ networkItem }: Props) => {
  const { t } = useI18n();
  const { connectToNetwork, removeRpcNode } = useNetworkContext();
  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();

  const { confirm } = useConfirmContext();

  const { chainId, name, icon, api, connection, nodes, disconnect } = networkItem;
  const { connectionType, activeNode } = connection;

  const [nodeToEdit, setNodeToEdit] = useState<RpcNode>();
  const [selectedNode, setSelectedNode] = useState(
    {
      [ConnectionType.DISABLED]: 'Select connection type',
      [ConnectionType.RPC_NODE]: activeNode?.url,
      [ConnectionType.LIGHT_CLIENT]: LIGHT_CLIENT_KEY,
    }[connectionType] || 'Select connection type',
  );

  const isDisabled = connectionType === ConnectionType.DISABLED;
  const combinedNodes = nodes.concat(connection.customNodes || []);
  const existingUrls = combinedNodes.reduce((acc, node) => {
    if (!nodeToEdit || nodeToEdit.url !== node.url) {
      acc.push(node.url);
    }

    return acc;
  }, [] as string[]);

  const isCustomNode = (url: string) => {
    return connection.customNodes?.some((node) => node.url === url);
  };

  const disableNetwork = async () => {
    try {
      await disconnect?.(false);
    } catch (error) {
      console.warn(error);
    }
  };

  const confirmRemoveCustomNode = (): Promise<boolean> =>
    confirm({
      title: t('networkManagement.removeCustomNodeModal.title'),
      message: <Trans i18nKey="networkManagement.removeCustomNodeModal.label" />,
      confirmText: t('networkManagement.removeCustomNodeModal.confirmButton'),
      cancelText: t('networkManagement.removeCustomNodeModal.cancelButton'),
    });

  const confirmDisableNetwork = (): Promise<boolean> =>
    confirm({
      title: t('networkManagement.disableNetworkModal.disableTitle'),
      message: <Trans t={t} i18nKey="networkManagement.disableNetworkModal.disableLabel" values={{ network: name }} />,
      confirmText: t('networkManagement.disableNetworkModal.confirmButton'),
      cancelText: t('networkManagement.disableNetworkModal.cancelButton'),
    });

  const confirmDisableLightClient = (): Promise<boolean> =>
    confirm({
      title: t('networkManagement.disableNetworkModal.relayChainTitle'),
      message: <Trans i18nKey="networkManagement.disableNetworkModal.relayChainLabel" />,
      confirmText: t('networkManagement.disableNetworkModal.confirmButton'),
      cancelText: t('networkManagement.disableNetworkModal.cancelButton'),
    });

  const changeConnection = async (nodeId: string, onClose: () => void) => {
    if (connectionType === ConnectionType.LIGHT_CLIENT) {
      const result = await confirmDisableLightClient();

      if (!result) return;
    }

    setSelectedNode(nodeId);

    try {
      await disconnect?.(true);

      if (nodeId === LIGHT_CLIENT_KEY) {
        // Let unsubscribe from previous Provider, microtask first - macrotask second
        setTimeout(() => {
          connectToNetwork(chainId, ConnectionType.LIGHT_CLIENT);
        });
      }

      const node = combinedNodes.find((n) => n.url === nodeId);
      if (node) {
        // Let unsubscribe from previous Provider, microtask first - macrotask second
        setTimeout(() => {
          connectToNetwork(chainId, ConnectionType.RPC_NODE, node);
        });
      }
    } catch (error) {
      console.warn(error);
    }
    onClose();
  };

  const onRemoveCustomNode = (rpcNode: RpcNode) => async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const result = await confirmRemoveCustomNode();
    if (!result) return;

    try {
      await removeRpcNode(chainId, rpcNode);
    } catch (error) {
      console.warn(error);
    }
  };

  const onEditCustomNode = (rpcNode: RpcNode) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setNodeToEdit(rpcNode);
    toggleCustomRpc();
  };

  const openDisableModal = async () => {
    let result = false;
    if (connectionType === ConnectionType.LIGHT_CLIENT) {
      result = await confirmDisableLightClient();
    } else if (connectionType === ConnectionType.RPC_NODE) {
      result = await confirmDisableNetwork();
    }
    if (!result) return;

    disableNetwork();
  };

  const onCloseRpcModal = async (newNode?: RpcNode) => {
    toggleCustomRpc();

    const shouldReconnect =
      newNode &&
      nodeToEdit &&
      (newNode.name !== nodeToEdit.name || newNode.url !== nodeToEdit.url) &&
      selectedNode === nodeToEdit.url;

    setNodeToEdit(undefined);
    if (!shouldReconnect) return;

    setSelectedNode(newNode.url);
    try {
      await disconnect?.(true);

      // Let unsubscribe from previous Provider, microtask first - macrotask second
      setTimeout(() => {
        connectToNetwork(chainId, ConnectionType.RPC_NODE, newNode);
      });
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <>
      <Popover className="relative">
        <Popover.Button
          className={cn(
            'flex items-center justify-between px-2.5 h-10 w-72 rounded-2lg border border-shade-10',
            'text-neutral font-semibold text-sm',
            isDisabled && 'text-shade-30',
          )}
        >
          <span className="truncate">
            {{
              [ConnectionType.DISABLED]: t('networkManagement.selectConnection.selectConnectionLabel'),
              [ConnectionType.RPC_NODE]: activeNode?.name,
              [ConnectionType.LIGHT_CLIENT]: t('networkManagement.selectConnection.lightClient'),
            }[connectionType] || ''}
          </span>
          <Icon className="shrink-0 ml-2" name="dropdown" size={20} />
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
                          <div className={checked ? 'text-primary' : ''}>{t('networkManagement.lightClientLabel')}</div>
                        </div>
                      </>
                    )}
                  </RadioGroup.Option>
                  {combinedNodes.map((node) => (
                    <RadioGroup.Option
                      value={node.url}
                      key={node.name}
                      className={cn(
                        'group flex h-10 px-4 box-border items-center',
                        ' cursor-pointer text-sm font-semibold text-neutral hover:bg-shade-2',
                      )}
                    >
                      {({ checked }) => (
                        <>
                          <div
                            className={cn(
                              'shrink-0 rounded-full w-5 h-5 mr-2.5',
                              checked ? 'border-[6px] border-primary' : 'border-2 border-shade-30',
                            )}
                          />
                          <div className="mr-auto overflow-clip">
                            <p className={cn('truncate', checked && 'text-primary')}>{node.name}</p>
                            <p className={cn('font-semibold text-xs text-neutral-variant truncate')}>{node.url}</p>
                          </div>
                          {isCustomNode(node.url) && (
                            <div className="gap-x-2.5 ml-1 h-full hidden group-hover:flex group-focus:flex">
                              <button className="text-neutral-variant" type="button" onClick={onEditCustomNode(node)}>
                                <Icon name="editOutline" size={20} />
                              </button>

                              {activeNode?.url !== node.url && (
                                <button className="text-error" type="button" onClick={onRemoveCustomNode(node)}>
                                  <Icon name="deleteOutline" size={20} />
                                </button>
                              )}
                            </div>
                          )}
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
                  {t('networkManagement.addCustomNodeButton')}
                </Button>
                {!isDisabled && (
                  <Button
                    onClick={openDisableModal}
                    pallet="error"
                    variant="text"
                    className="h-7.5"
                    prefixElement={<Icon name="disable" size={16} />}
                  >
                    {t('networkManagement.disableNetworkButton')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Popover.Panel>
      </Popover>

      <CustomRpcModal
        chainId={chainId}
        node={nodeToEdit}
        network={{ name, icon, genesisHash: api?.genesisHash.toHex() }}
        existingUrls={existingUrls}
        isOpen={isCustomRpcOpen}
        onClose={onCloseRpcModal}
      />
    </>
  );
};

export default Selector;
