import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type ChainId, type RpcNode } from '@/shared/core';
import { ConnectionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { useConfirmContext } from '@/shared/providers';
import { Paths } from '@/shared/routes';
import { BaseModal, InfoLink } from '@/shared/ui';
import { type ExtendedChain, networkModel, networkUtils } from '@/entities/network';
import {
  ActiveNetwork,
  AddCustomRpcModal,
  EditCustomRpcModal,
  EmptyNetworks,
  InactiveNetwork,
  NetworkList,
  NetworkSelector,
  NetworksFilter,
  type SelectorPayload,
  activeNetworksModel,
  addCustomRpcModel,
  editCustomRpcModel,
  inactiveNetworksModel,
  networkSelectorModel,
  networksFilterModel,
  removeCustomRpcModel,
} from '@/features/network';
import { networksOverviewModel } from '../model/networks-overview-model';

const MAX_LIGHT_CLIENTS = 3;

const DATA_VERIFICATION = 'https://docs.novaspektr.io/network-management/light-clients-and-parachain-data-verification';

export const Networks = () => {
  const { t } = useI18n();

  const navigate = useNavigate();
  const { confirm } = useConfirmContext();

  const connections = useUnit(networkModel.$connections);
  const filterQuery = useUnit(networksFilterModel.$filterQuery);

  const activeNetworks = useUnit(activeNetworksModel.$activeNetworks);
  const activeConnectionsMap = useUnit(networksOverviewModel.$activeConnectionsMap);

  const inactiveNetworks = useUnit(inactiveNetworksModel.$inactiveNetworks);
  const inactiveConnectionsMap = useUnit(networksOverviewModel.$inactiveConnectionsMap);

  const [isNetworksModalOpen, closeModal] = useModalClose(true, () => navigate(Paths.SETTINGS));

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

  const disableNetwork = ({ connection, name }: ExtendedChain) => {
    return async (): Promise<void> => {
      let proceed = false;
      if (networkUtils.isLightClientConnection(connection)) {
        proceed = await confirmDisableLightClient(name);
      } else if (networkUtils.isRpcConnection(connection) || networkUtils.isAutoBalanceConnection(connection)) {
        proceed = await confirmDisableNetwork(name);
      }
      if (!proceed) return;

      networkSelectorModel.events.networkDisabled(connection.chainId);
    };
  };

  const connectToNode = ({ chainId, connection, name }: ExtendedChain) => {
    return async (type: ConnectionType, node?: RpcNode): Promise<void> => {
      if (networkUtils.isLightClientConnection(connection)) {
        const proceed = await confirmDisableLightClient(name);
        if (!proceed) {
          return;
        }
      }

      if (type === ConnectionType.LIGHT_CLIENT) {
        const lightClientsAmount = Object.values(connections).filter(networkUtils.isLightClientConnection).length;

        if (lightClientsAmount >= MAX_LIGHT_CLIENTS) {
          const proceed = await confirmEnableLightClient();
          if (!proceed) {
            return;
          }
        }
      }

      if (type === ConnectionType.LIGHT_CLIENT) {
        networkSelectorModel.events.lightClientSelected(chainId);
      } else if (type === ConnectionType.AUTO_BALANCE) {
        networkSelectorModel.events.autoBalanceSelected(chainId);
      } else if (node) {
        networkSelectorModel.events.rpcNodeSelected({ chainId, node });
      }
    };
  };

  const changeConnection = (network: ExtendedChain) => {
    const handleDisableNetwork = disableNetwork(network);
    const handleConnectToNode = connectToNode(network);

    return async (payload: SelectorPayload) => {
      if (payload.type === ConnectionType.DISABLED) {
        await handleDisableNetwork();
      } else {
        await handleConnectToNode(payload.type, payload.node);
      }
    };
  };

  const removeCustomNode = async (chainId: ChainId, node: RpcNode) => {
    const proceed = await confirmRemoveCustomNode(node.name);
    if (!proceed) return;

    removeCustomRpcModel.events.rpcNodeRemoved({ chainId, node });
  };

  const addCustomNode = (network: ExtendedChain) => {
    addCustomRpcModel.events.flowStarted({
      chainName: network.name,
      connection: network.connection,
      existingNodes: network.nodes.concat(network.connection.customNodes),
    });
  };

  const editCustomNode = (network: ExtendedChain, node: RpcNode) => {
    editCustomRpcModel.events.flowStarted({
      chainName: network.name,
      nodeToEdit: node,
      connection: network.connection,
      existingNodes: network.nodes.concat(network.connection.customNodes),
    });
  };

  return (
    <BaseModal
      closeButton
      contentClass="pt-4"
      panelClass="w-[784px]"
      isOpen={isNetworksModalOpen}
      title={t('settings.networks.title')}
      onClose={closeModal}
    >
      <div className="mx-5">
        <NetworksFilter />
      </div>

      <div className="mt-5 flex h-[454px] flex-col gap-y-4 overflow-y-auto px-3 pb-4 pt-1">
        <NetworkList
          query={filterQuery}
          title={t('settings.networks.disabledNetworksLabel')}
          networkList={inactiveNetworks}
        >
          {(network) => (
            <InactiveNetwork networkItem={network}>
              <NetworkSelector
                connectionList={inactiveConnectionsMap[network.chainId].connections}
                activeConnection={inactiveConnectionsMap[network.chainId].activeConnection}
                onChange={changeConnection(network)}
                onRemoveCustomNode={(node) => removeCustomNode(network.chainId, node)}
                onAddCustomNode={() => addCustomNode(network)}
                onEditCustomNode={(node) => editCustomNode(network, node)}
              />
            </InactiveNetwork>
          )}
        </NetworkList>

        <NetworkList
          query={filterQuery}
          title={t('settings.networks.activeNetworksLabel')}
          networkList={activeNetworks}
        >
          {(network) => (
            <ActiveNetwork networkItem={network}>
              <NetworkSelector
                connectionList={activeConnectionsMap[network.chainId].connections}
                activeConnection={activeConnectionsMap[network.chainId].activeConnection}
                onChange={changeConnection(network)}
                onRemoveCustomNode={(node) => removeCustomNode(network.chainId, node)}
                onAddCustomNode={() => addCustomNode(network)}
                onEditCustomNode={(node) => editCustomNode(network, node)}
              />
            </ActiveNetwork>
          )}
        </NetworkList>

        <EmptyNetworks />
      </div>

      <AddCustomRpcModal />
      <EditCustomRpcModal />
    </BaseModal>
  );
};
