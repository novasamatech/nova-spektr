import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { NetworkSelector } from '../NetworkSelector/NetworkSelector';
import { BodyText, StatusLabel } from '@renderer/components/ui-redesign';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { useI18n } from '@renderer/context/I18nContext';
import { RpcNode } from '@renderer/domain/chain';

const Status = {
  [ConnectionStatus.CONNECTING]: { title: 'settings.networks.connectingStatusLabel', variant: 'waiting' },
  [ConnectionStatus.CONNECTED]: { title: 'settings.networks.connectedStatusLabel', variant: 'success' },
  [ConnectionStatus.ERROR]: { title: 'settings.networks.errorStatusLabel', variant: 'error' },
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

  const { icon, name, connection } = networkItem;
  const { connectionType, connectionStatus, activeNode } = connection;

  const networkIsActive = connectionType !== ConnectionType.DISABLED && connectionStatus !== ConnectionStatus.NONE;

  return (
    <div className="flex items-center py-3">
      <img src={icon} alt="" width={26} height={26} />
      <div className="flex flex-col ml-2 mr-auto pr-2 overflow-hidden">
        <BodyText className="truncate">{name}</BodyText>
        {networkIsActive && activeNode && <HelpText className="text-text-tertiary truncate">{activeNode.url}</HelpText>}
      </div>
      {networkIsActive && (
        <StatusLabel
          title={t(Status[connectionStatus].title)}
          variant={Status[connectionStatus].variant}
          className="mr-8.5"
        />
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
