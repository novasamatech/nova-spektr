import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans } from 'react-i18next';
import uniqBy from 'lodash/uniqBy';
import { useUnit } from 'effector-react';

import { useI18n, useNetworkContext, useConfirmContext, Paths } from '@renderer/app/providers';
import { BaseModal, SearchInput, BodyText, InfoLink, Icon } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { ExtendedChain, chainsService } from '@renderer/entities/network';
import { includes, DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { NetworkList, NetworkItem, CustomRpcModal } from './components';
import { useBalance } from '@renderer/entities/asset';
import type { RpcNode, ChainId } from '@renderer/shared/core';
import { ConnectionType, ConnectionStatus } from '@renderer/shared/core';
import { walletModel } from '@renderer/entities/wallet';

const MAX_LIGHT_CLIENTS = 3;

const DATA_VERIFICATION = 'https://docs.novaspektr.io/network-management/light-clients-and-parachain-data-verification';

export const Networks = () => {
  const { t } = useI18n();
  const accounts = useUnit(walletModel.$accounts);

  const navigate = useNavigate();
  const { confirm } = useConfirmContext();
  const { connections, connectToNetwork, connectWithAutoBalance, removeRpcNode, getParachains } = useNetworkContext();
  const { setBalanceIsValid } = useBalance();

  const [isCustomRpcOpen, toggleCustomRpc] = useToggle();
  const [isNetworksModalOpen, toggleNetworksModal] = useToggle(true);

  const [query, setQuery] = useState('');
  const [nodeToEdit, setNodeToEdit] = useState<RpcNode>();
  const [network, setNetwork] = useState<ExtendedChain>();

  const closeNetworksModal = () => {
    toggleNetworksModal();
    setTimeout(() => navigate(Paths.SETTINGS), DEFAULT_TRANSITION);
  };

  const { inactive, active } = Object.values(connections).reduce<Record<'inactive' | 'active', ExtendedChain[]>>(
    (acc, c) => {
      if (!includes(c.name, query)) return acc;

      if (c.connection.connectionType === ConnectionType.DISABLED) {
        acc.inactive.push(c);
      }
      if (c.connection.connectionStatus !== ConnectionStatus.NONE) {
        acc.active.push(c);
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
        await removeRpcNode(chainId, node);
      } catch (error) {
        console.warn(error);
      }
    };
  };

  const disableNetwork = ({ disconnect, connection, name }: ExtendedChain) => {
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
        await disconnect?.(false);
      } catch (error) {
        console.warn(error);
      }
    };
  };

  const resetBalanceValidation = async (relaychainId: ChainId) => {
    const parachains = getParachains(relaychainId);
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

  const connectToNode = ({ chainId, connection, disconnect, name }: ExtendedChain) => {
    return async (type: ConnectionType, node?: RpcNode): Promise<void> => {
      if (connection.connectionType === ConnectionType.LIGHT_CLIENT) {
        const proceed = await confirmDisableLightClient(name);
        if (!proceed) return;

        resetBalanceValidation(connection.chainId);
      }

      if (type === ConnectionType.LIGHT_CLIENT) {
        const lightClientsAmount = Object.values(connections).filter(
          ({ connection }) => connection.connectionType === ConnectionType.LIGHT_CLIENT,
        ).length;

        if (lightClientsAmount >= MAX_LIGHT_CLIENTS) {
          const proceed = await confirmEnableLightClient();
          if (!proceed) return;
        }
      }

      try {
        await disconnect?.(true);

        // Let unsubscribe from previous Provider, microtask first - macrotask second
        if (type === ConnectionType.LIGHT_CLIENT) {
          setTimeout(() => {
            connectToNetwork({ chainId, type: ConnectionType.LIGHT_CLIENT });
          });
        } else if (type === ConnectionType.AUTO_BALANCE) {
          setTimeout(() => {
            connectWithAutoBalance(chainId, 0);
          });
        } else if (node) {
          setTimeout(() => {
            connectToNetwork({ chainId, type: ConnectionType.RPC_NODE, node });
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
      try {
        await network.disconnect?.(true);

        // Let unsubscribe from previous Provider, microtask first - macrotask second
        setTimeout(() => {
          connectToNetwork({ chainId: network.chainId, type: ConnectionType.RPC_NODE, node });
        });
      } catch (error) {
        console.warn(error);
      }
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
