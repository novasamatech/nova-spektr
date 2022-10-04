import { useState } from 'react';
import { Popover, RadioGroup } from '@headlessui/react';
import cn from 'classnames';

import useToggle from '@renderer/hooks/useToggle';
import CustomRpcModal from '@renderer/screens/Settings/Networks/ConnectionSelector/CustomRpcModal/CustomRpcModal';
import { Button, Icon } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useConfirmContext } from '@renderer/context/ConfirmContext';

const LIGHT_CLIENT_KEY = 'light-client';

type Props = {
  networkItem: ExtendedChain;
};

const Selector = ({ networkItem }: Props) => {
  const { t } = useI18n();
  const { connectToNetwork } = useNetworkContext();
  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();

  const { confirm } = useConfirmContext();

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

  const disableNetwork = async () => {
    try {
      await networkItem.disconnect?.(false);
    } catch (error) {
      console.warn(error);
    }
  };

  const confirmDisableLightClient = () =>
    confirm({
      title: t('networkManagement.disableLightClientNetworkModal.title'),
      message: t('networkManagement.disableLightClientNetworkModal.label'),
      confirmText: t('networkManagement.disableLightClientNetworkModal.confirm'),
      cancelText: t('networkManagement.disableLightClientNetworkModal.cancel'),
    });

  const confirmDisableNetwork = () =>
    confirm({
      title: t('networkManagement.disableLightClientNetworkModal.title'),
      message: t('networkManagement.disableLightClientNetworkModal.label'),
      confirmText: t('networkManagement.disableLightClientNetworkModal.confirm'),
      cancelText: t('networkManagement.disableLightClientNetworkModal.cancel'),
    });

  const changeConnection = async (nodeId: string, onClose: () => void) => {
    if (connectionType === ConnectionType.LIGHT_CLIENT) {
      const result = await confirmDisableLightClient();

      if (!result) return;
    }

    setSelectedNode(nodeId);

    try {
      await networkItem.disconnect?.(true);

      if (nodeId === LIGHT_CLIENT_KEY) {
        // Let unsubscribe from previous Provider, microtask first - macrotask second
        setTimeout(() => {
          connectToNetwork(networkItem.chainId, ConnectionType.LIGHT_CLIENT);
        });
      }

      const node = nodes.find((n) => n.url === nodeId);
      if (node) {
        // Let unsubscribe from previous Provider, microtask first - macrotask second
        setTimeout(() => {
          connectToNetwork(networkItem.chainId, ConnectionType.RPC_NODE, node);
        });
      }

      onClose();
    } catch (error) {
      console.warn(error);
    }
  };

  const openDisableModal = async () => {
    if (connectionType === ConnectionType.LIGHT_CLIENT) {
      const result = await confirmDisableLightClient();

      if (!result) return;
      disableNetwork();
    } else if (connectionType === ConnectionType.RPC_NODE) {
      const result = await confirmDisableNetwork();

      if (!result) return;
      disableNetwork();
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
            [ConnectionType.DISABLED]: t('networkManagement.selectConnection.selectConnectionLabel'),
            [ConnectionType.RPC_NODE]: activeNode?.name,
            [ConnectionType.LIGHT_CLIENT]: t('networkManagement.selectConnection.lightClient'),
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
