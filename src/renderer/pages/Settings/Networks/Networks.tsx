import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans } from 'react-i18next';
import uniqBy from 'lodash/uniqBy';
import { useUnit } from 'effector-react';

import { useI18n, useConfirmContext } from '@app/providers';
import { Paths } from '@shared/routes';
import { BaseModal, SearchInput, BodyText, InfoLink, Icon } from '@shared/ui';
import { useToggle } from '@shared/lib/hooks';
import { includes, DEFAULT_TRANSITION } from '@shared/lib/utils';
import { NetworkList, NetworkItem, CustomRpcModal } from './components';
import { useBalance } from '@entities/asset';
import type { RpcNode, ChainId } from '@shared/core';
import { ConnectionType } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { getParachains, networkModel, ExtendedChain, chainsService } from '@entities/network';

const MAX_LIGHT_CLIENTS = 3;

const DATA_VERIFICATION = 'https://docs.novaspektr.io/network-management/light-clients-and-parachain-data-verification';

export const Networks = () => {
  const { t } = useI18n();
  const accounts = useUnit(walletModel.$accounts);

  const navigate = useNavigate();
  const { confirm } = useConfirmContext();
  const { setBalanceIsValid } = useBalance();

  const connections = useUnit(networkModel.$connections);
  const chains = useUnit(networkModel.$chains);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);

  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();
  const [isNetworksModalOpen, toggleNetworksModal] = useToggle(true);

  const [query, setQuery] = useState('');
  const [nodeToEdit, setNodeToEdit] = useState<RpcNode>();
  const [network, setNetwork] = useState<ExtendedChain>();

  const closeNetworksModal = () => {
    toggleNetworksModal();
    setTimeout(() => navigate(Paths.SETTINGS), DEFAULT_TRANSITION);
  };

  const { inactive, active } = Object.values(chains).reduce<Record<'inactive' | 'active', ExtendedChain[]>>(
    (acc, chain) => {
      if (!includes(chain.name, query)) return acc;

      const connection = connections[chain.chainId];
      const extendedChain = {
        ...chain,
        connection,
        connectionStatus: connectionStatuses[chain.chainId],
      };

      if (connection?.connectionType === ConnectionType.DISABLED) {
        acc.inactive.push(extendedChain);
      } else {
        acc.active.push(extendedChain);
      }

      return acc;
    },
    { inactive: [], active: [] },
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
    const verify = <InfoLink url={DATA_VERIFICATION} showIcon={false} />;

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
        await networkModel.events.rpcNodeRemoved({
          chainId,
          rpcNode: node,
        });
      } catch (error) {
        console.warn(error);
      }
    };
  };

  const disableNetwork = ({ connection, name }: ExtendedChain) => {
    return async (): Promise<void> => {
      let proceed = false;
      if (connection.connectionType === ConnectionType.LIGHT_CLIENT) {
        proceed = await confirmDisableLightClient(name);

        if (proceed) {
          resetBalanceValidation(connection.chainId);
        }
      } else if ([ConnectionType.RPC_NODE, ConnectionType.AUTO_BALANCE].includes(connection.connectionType)) {
        proceed = await confirmDisableNetwork(name);
      }
      if (!proceed) return;

      try {
        networkModel.events.disconnectStarted(connection.chainId);
      } catch (error) {
        console.warn(error);
      }
    };
  };

  const resetBalanceValidation = async (relaychainId: ChainId) => {
    const parachains = getParachains(chains, relaychainId);
    const uniqAccounts = uniqBy(accounts, 'accountId');

    parachains.forEach(({ chainId, assets }) => {
      uniqAccounts.forEach(({ accountId }) => {
        assets.forEach(({ assetId }) => {
          // TODO: Use bulkUpdate when dexie 4.0 will be released
          setBalanceIsValid({ chainId, accountId, assetId: assetId.toString() }, true);
        });
      });
    });
  };

  const connectToNode = ({ chainId, connection, name }: ExtendedChain) => {
    return async (type: ConnectionType, node?: RpcNode): Promise<void> => {
      if (connection.connectionType === ConnectionType.LIGHT_CLIENT) {
        const proceed = await confirmDisableLightClient(name);
        if (!proceed) return;

        resetBalanceValidation(connection.chainId);
      }

      if (type === ConnectionType.LIGHT_CLIENT) {
        const lightClientsAmount = Object.values(connections).filter(
          (connection) => connection.connectionType === ConnectionType.LIGHT_CLIENT,
        ).length;

        if (lightClientsAmount >= MAX_LIGHT_CLIENTS) {
          const proceed = await confirmEnableLightClient();
          if (!proceed) return;
        }
      }

      try {
        // Let unsubscribe from previous Provider, microtask first - macrotask second
        if (type === ConnectionType.LIGHT_CLIENT) {
          setTimeout(() => {
            networkModel.events.lightClientSelected(chainId);
          });
        } else if (type === ConnectionType.AUTO_BALANCE) {
          setTimeout(() => {
            networkModel.events.autoBalanceSelected(chainId);
          });
        } else if (node) {
          setTimeout(() => {
            networkModel.events.singleNodeSelected({ chainId, node });
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
      networkModel.events.rpcNodeUpdated({ chainId: network.chainId, oldNode: nodeToEdit, rpcNode: node });
    } else if (node && network) {
      networkModel.events.rpcNodeAdded({ chainId: network.chainId, rpcNode: node });
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
        <SearchInput wrapperClass="mx-5" placeholder="Search" value={query} onChange={setQuery} />

        <div className="flex flex-col gap-y-4 px-5 pb-4 pt-1 mt-5 h-[454px] overflow-y-auto">
          <NetworkList
            isDefaultOpen={false}
            query={query}
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
            query={query}
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
            <div className="flex flex-col items-center mx-auto pt-12 pb-15">
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
