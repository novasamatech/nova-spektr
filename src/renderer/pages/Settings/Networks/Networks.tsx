import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { useI18n, useConfirmContext } from '@app/providers';
import { Paths } from '@shared/routes';
import { BaseModal, InfoLink } from '@shared/ui';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { CustomRpcModal, NetworkSelector } from './components';
import type { RpcNode, ChainId } from '@shared/core';
import { ConnectionType } from '@shared/core';
import { networkModel, ExtendedChain, networkUtils } from '@entities/network';
import { manageNetworkModel } from './model/manage-network-model';
import {
  EmptyNetworks,
  NetworkList,
  InactiveNetwork,
  activeNetworksModel,
  inactiveNetworksModel,
  ActiveNetwork,
  NetworksFilter,
  networksFilterModel,
} from '@features/network';

import './model/networks-overview-model';

const MAX_LIGHT_CLIENTS = 3;

const DATA_VERIFICATION = 'https://docs.novaspektr.io/network-management/light-clients-and-parachain-data-verification';

export const Networks = () => {
  const { t } = useI18n();

  const navigate = useNavigate();
  const { confirm } = useConfirmContext();

  const activeNetworks = useUnit(activeNetworksModel.$activeNetworks);
  const inactiveNetworks = useUnit(inactiveNetworksModel.$inactiveNetworks);
  const connections = useUnit(networkModel.$connections);
  const filterQuery = useUnit(networksFilterModel.$filterQuery);

  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();
  const [isNetworksModalOpen, toggleNetworksModal] = useToggle(true);

  const [nodeToEdit, setNodeToEdit] = useState<RpcNode>();
  const [network, setNetwork] = useState<ExtendedChain>();

  const closeNetworksModal = () => {
    toggleNetworksModal();
    setTimeout(() => navigate(Paths.SETTINGS), DEFAULT_TRANSITION);
  };

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

      if (type === ConnectionType.LIGHT_CLIENT) {
        manageNetworkModel.events.lightClientSelected(chainId);
      } else if (type === ConnectionType.AUTO_BALANCE) {
        manageNetworkModel.events.autoBalanceSelected(chainId);
      } else if (node) {
        manageNetworkModel.events.rpcNodeSelected({ chainId, node });
      }
    };
  };

  const changeCustomNode = (network: ExtendedChain) => {
    return (node?: RpcNode) => {
      setNodeToEdit(node);
      setNetwork(network);

      toggleCustomRpc();
    };
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
    <BaseModal
      closeButton
      contentClass="pt-4"
      panelClass="w-[784px]"
      isOpen={isNetworksModalOpen}
      title={t('settings.networks.title')}
      onClose={closeNetworksModal}
    >
      <NetworksFilter className="mx-5" />

      <div className="flex flex-col gap-y-4 px-3 pb-4 pt-1 mt-5 h-[454px] overflow-y-auto">
        <NetworkList
          query={filterQuery}
          title={t('settings.networks.disabledNetworksLabel')}
          networkList={inactiveNetworks}
        >
          {(network) => (
            <InactiveNetwork networkItem={network}>
              <NetworkSelector
                networkItem={network}
                onConnect={connectToNode(network)}
                onDisconnect={disableNetwork(network)}
                onRemoveCustomNode={removeCustomNode(network.chainId)}
                onChangeCustomNode={changeCustomNode(network)}
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
                networkItem={network}
                onConnect={connectToNode(network)}
                onDisconnect={disableNetwork(network)}
                onRemoveCustomNode={removeCustomNode(network.chainId)}
                onChangeCustomNode={changeCustomNode(network)}
              />
            </ActiveNetwork>
          )}
        </NetworkList>

        <EmptyNetworks />
      </div>

      {network && (
        <CustomRpcModal isOpen={isCustomRpcOpen} node={nodeToEdit} network={network} onClose={closeCustomRpcModal} />
      )}
    </BaseModal>
  );
};
