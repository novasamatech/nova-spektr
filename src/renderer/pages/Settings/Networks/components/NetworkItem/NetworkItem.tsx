import { TFunction } from 'react-i18next';

import { ExtendedChain } from '@entities/network';
import { NetworkSelector } from '../NetworkSelector/NetworkSelector';
import { BodyText, StatusLabel, FootnoteText, HelpText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainIcon } from '@entities/chain';
import { ConnectionStatus, ConnectionType } from '@shared/core';
import type { RpcNode } from '@shared/core';
import './NetworkItem.css';

const Status = {
  connecting: {
    variant: 'waiting',
    title: (t: TFunction) => (
      <div className="spektr-waiting">
        <FootnoteText className="text-text-tertiary">{t('settings.networks.connectingStatusLabel')}</FootnoteText>
      </div>
    ),
  },
  connected: {
    variant: 'success',
    title: (t: TFunction) => t('settings.networks.connectedStatusLabel'),
  },
  error: { variant: 'error', title: (t: TFunction) => t('settings.networks.errorStatusLabel') },
} as const;

type Props = {
  networkItem: ExtendedChain;
  onDisconnect: () => void;
  onConnect: (type: ConnectionType, node?: RpcNode) => void;
  onRemoveCustomNode: (node: RpcNode) => void;
  onChangeCustomNode: (node?: RpcNode) => void;
};

export const NetworkItem = ({
  networkItem,
  onDisconnect,
  onConnect,
  onRemoveCustomNode,
  onChangeCustomNode,
}: Props) => {
  const { t } = useI18n();

  const { icon, name, connection, connectionStatus } = networkItem;
  const { connectionType, activeNode } = connection;

  const networkIsActive = connectionType !== ConnectionType.DISABLED;
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED;
  const isError = connectionStatus === ConnectionStatus.CONNECTED;

  const status = isConnected ? 'connected' : networkIsActive && isError ? 'error' : 'connecting';

  return (
    <div className="flex items-center py-3">
      <ChainIcon src={icon} name={name} size={26} />
      <div className="flex flex-col ml-2 mr-auto pr-2 overflow-hidden">
        <BodyText className="truncate">{name}</BodyText>
        {networkIsActive && activeNode && <HelpText className="text-text-tertiary truncate">{activeNode.url}</HelpText>}
      </div>
      {networkIsActive && (
        <StatusLabel title={Status[status].title(t)} variant={Status[status].variant} className="mr-8.5" />
      )}
      <NetworkSelector
        networkItem={networkItem}
        onDisconnect={onDisconnect}
        onConnect={onConnect}
        onRemoveCustomNode={onRemoveCustomNode}
        onChangeCustomNode={onChangeCustomNode}
      />
    </div>
  );
};
