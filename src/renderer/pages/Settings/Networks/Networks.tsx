import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans } from 'react-i18next';
import partition from 'lodash/partition';
import { useUnit } from 'effector-react';

import { useI18n, useConfirmContext } from '@app/providers';
import { Paths } from '@shared/routes';
import { BaseModal, SearchInput, BodyText, InfoLink, Icon } from '@shared/ui';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { NetworkList, NetworkItem, CustomRpcModal } from './components';
import type { RpcNode, ChainId } from '@shared/core';
import { ConnectionType } from '@shared/core';
import { networkModel, ExtendedChain, networkUtils } from '@entities/network';
import { chainsService } from '@shared/api/network';
import { manageNetworkModel } from './model/manage-network-model';
import { filterModel } from '@features/networks/NetworkFilter/model/network-filter';

const MAX_LIGHT_CLIENTS = 3;

const DATA_VERIFICATION = 'https://docs.novaspektr.io/network-management/light-clients-and-parachain-data-verification';

export const Networks = () => {
  const { t } = useI18n();

  const navigate = useNavigate();
  const { confirm } = useConfirmContext();

  const connections = useUnit(networkModel.$connections);
  const filteredNetworks = useUnit(filterModel.$networksFiltered);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);

  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();
  const [isNetworksModalOpen, toggleNetworksModal] = useToggle(true);

  const [nodeToEdit, setNodeToEdit] = useState<RpcNode>();
  const [network, setNetwork] = useState<ExtendedChain>();

  console.log('connections', connections);

  const closeNetworksModal = () => {
    toggleNetworksModal();
    setTimeout(() => navigate(Paths.SETTINGS), DEFAULT_TRANSITION);
  };

  useEffect(() => {
    filterModel.events.componentMounted();
  }, []);

  const extendedChains = filteredNetworks.reduce<ExtendedChain[]>((acc, chain) => {
    const connection = connections[chain.chainId];
    const extendedChain = {
      ...chain,
      connection,
      connectionStatus: connectionStatuses[chain.chainId],
    };

    acc.push(extendedChain);

    return acc;
  }, []);

  const [inactive, active] = partition(extendedChains, ({ connection }) =>
    networkUtils.isDisabledConnection(connection),
  );

  const confirmRemoveCustomNode = (name: string): Promise<boolean> => {
    return confirm({
      title: t('settings.networks.confirmModal.removeTitle'),
      message: <Trans t={t} i18nKey="settings.networks.confirmModal.removeLabel" values={{ node: name }} />,
      confirmText: t('settings.networks.confirmModal.confirmButton'),
      cancelText: t('settings.networks.confirmModal.cancelButton'),
    });
  };

  const confirmDisableNetwork = (name: string): Promise<boolean> => {
    return confirm({
      title: t('settings.networks.confirmModal.disableTitle'),
      message: <Trans t={t} i18nKey="settings.networks.confirmModal.disableLabel" values={{ network: name }} />,
      confirmText: t('settings.networks.confirmModal.confirmButton'),
      cancelText: t('settings.networks.confirmModal.cancelButton'),
    });
  };

  const confirmDisableLightClient = (name: string): Promise<boolean> => {
    const verify = <InfoLink url={DATA_VERIFICATION} />;

    return confirm({
      title: t('settings.networks.confirmModal.disableLightTitle'),
      message: (
        <Trans
          t={t}
          i18nKey="settings.networks.confirmModal.disableLightLabel"
          components={{ verify }}
          values={{ network: name }}
        />
      ),
      confirmText: t('settings.networks.confirmModal.confirmButton'),
      cancelText: t('settings.networks.confirmModal.cancelButton'),
    });
  };

  const confirmEnableLightClient = (): Promise<boolean> => {
    return confirm({
      title: t('settings.networks.confirmModal.enableLightTitle'),
      message: <Trans t={t} i18nKey="settings.networks.confirmModal.enableLightLabel" />,
      confirmText: t('settings.networks.confirmModal.confirmButton'),
      cancelText: t('settings.networks.confirmModal.cancelButton'),
    });
  };

  const removeCustomNode = (chainId: ChainId) => {
    return async (node: RpcNode): Promise<void> => {
      const proceed = await confirmRemoveCustomNode(node.name);
      if (!proceed) return;

      try {
        manageNetworkModel.events.rpcNodeRemoved({ chainId, rpcNode: node });
      } catch (error) {
        console.warn(error);
      }
    };
  };

  const disableNetwork = ({ connection, name }: ExtendedChain) => {
    return async (): Promise<void> => {
      let proceed = false;
      if (networkUtils.isLightClientConnection(connection)) {
        proceed = await confirmDisableLightClient(name);
      } else if (networkUtils.isRpcConnection(connection) || networkUtils.isAutoBalanceConnection(connection)) {
        proceed = await confirmDisableNetwork(name);
      }
      if (!proceed) return;

      manageNetworkModel.events.chainDisabled(connection.chainId);
    };
  };

  const connectToNode = ({ chainId, connection, name }: ExtendedChain) => {
    return async (type: ConnectionType, node?: RpcNode): Promise<void> => {
      if (networkUtils.isLightClientConnection(connection)) {
        const proceed = await confirmDisableLightClient(name);
        if (!proceed) return;
      }

      if (type === ConnectionType.LIGHT_CLIENT) {
        const lightClientsAmount = Object.values(connections).filter(networkUtils.isLightClientConnection).length;

        if (lightClientsAmount >= MAX_LIGHT_CLIENTS) {
          const proceed = await confirmEnableLightClient();
          if (!proceed) return;
        }
      }

      try {
        // Let unsubscribe from previous Provider, microtask first - macrotask second
        if (type === ConnectionType.LIGHT_CLIENT) {
          setTimeout(() => {
            manageNetworkModel.events.lightClientSelected(chainId);
          });
        } else if (type === ConnectionType.AUTO_BALANCE) {
          setTimeout(() => {
            manageNetworkModel.events.autoBalanceSelected(chainId);
          });
        } else if (node) {
          setTimeout(() => {
            manageNetworkModel.events.rpcNodeSelected({ chainId, node });
          });
        }
      } catch (error) {
        console.warn(error);
      }
    };
  };

  const changeCustomNode = (network: ExtendedChain) => (node?: RpcNode) => {
    setNodeToEdit(node);
    setNetwork(network);

    toggleCustomRpc();
  };

  const closeCustomRpcModal = async (node?: RpcNode): Promise<void> => {
    toggleCustomRpc();

    if (node && network && network.connection.activeNode === nodeToEdit) {
      manageNetworkModel.events.rpcNodeUpdated({ chainId: network.chainId, oldNode: nodeToEdit, rpcNode: node });
    } else if (node && network) {
      manageNetworkModel.events.rpcNodeAdded({ chainId: network.chainId, rpcNode: node });
    }

    setTimeout(() => {
      setNodeToEdit(undefined);
      setNetwork(undefined);
    }, DEFAULT_TRANSITION);
  };

  return (
    <>
      <BaseModal
        closeButton
        contentClass="pt-4"
        panelClass="w-[784px]"
        isOpen={isNetworksModalOpen}
        title={t('settings.networks.title')}
        onClose={closeNetworksModal}
      >
        <SearchInput wrapperClass="mx-5" placeholder="Search" onChange={filterModel.events.queryChanged} />

        <div className="flex flex-col gap-y-4 px-3 pb-4 pt-1 mt-5 h-[454px] overflow-y-auto">
          <NetworkList
            isDefaultOpen={false}
            title={t('settings.networks.disabledNetworksLabel')}
            networkList={chainsService.sortChains(inactive)}
          >
            {(network) => (
              <NetworkItem
                networkItem={network}
                onConnect={connectToNode(network)}
                onDisconnect={disableNetwork(network)}
                onRemoveCustomNode={removeCustomNode(network.chainId)}
                onChangeCustomNode={changeCustomNode(network)}
              />
            )}
          </NetworkList>

          <NetworkList
            isDefaultOpen
            title={t('settings.networks.activeNetworksLabel')}
            networkList={chainsService.sortChains(active)}
          >
            {(network) => (
              <NetworkItem
                networkItem={network}
                onConnect={connectToNode(network)}
                onDisconnect={disableNetwork(network)}
                onRemoveCustomNode={removeCustomNode(network.chainId)}
                onChangeCustomNode={changeCustomNode(network)}
              />
            )}
          </NetworkList>

          {!inactive.length && !active.length && (
            <div className="flex flex-col items-center mx-auto pt-12 pb-15 px-2">
              <Icon as="img" name="emptyList" alt={t('settings.networks.emptyStateLabel')} size={178} />
              <BodyText className="w-52 text-center text-text-tertiary">
                {t('settings.networks.emptyStateLabel')}
              </BodyText>
            </div>
          )}
        </div>
      </BaseModal>

      {network && (
        <CustomRpcModal isOpen={isCustomRpcOpen} node={nodeToEdit} network={network} onClose={closeCustomRpcModal} />
      )}
    </>
  );
};

export default Networks;
