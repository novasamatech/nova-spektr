import { TFunction } from 'react-i18next';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { NetworkSelector } from '../NetworkSelector/NetworkSelector';
import { BodyText, StatusLabel, FootnoteText } from '@renderer/components/ui-redesign';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { useI18n } from '@renderer/context/I18nContext';
import { RpcNode } from '@renderer/domain/chain';
import './NetworkItem.css';
import { useToggle } from '@renderer/shared/hooks';
import { Shimmering } from '@renderer/components/ui';

const Status = {
  [ConnectionStatus.CONNECTING]: {
    variant: 'waiting',
    title: (t: TFunction) => (
      <div className="spektr-waiting">
        <FootnoteText className="text-text-tertiary">{t('settings.networks.connectingStatusLabel')}</FootnoteText>
      </div>
    ),
  },
  [ConnectionStatus.CONNECTED]: {
    variant: 'success',
    title: (t: TFunction) => t('settings.networks.connectedStatusLabel'),
  },
  [ConnectionStatus.ERROR]: { variant: 'error', title: (t: TFunction) => t('settings.networks.errorStatusLabel') },
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

  const [imgLoadError, toggleImgLoadError] = useToggle();

  const { icon, name, connection } = networkItem;
  const { connectionType, connectionStatus, activeNode } = connection;

  const networkIsActive = connectionType !== ConnectionType.DISABLED && connectionStatus !== ConnectionStatus.NONE;

  return (
    <div className="flex items-center py-3">
      {!imgLoadError ? (
        <img src={icon} alt="" width={26} height={26} onError={() => toggleImgLoadError()} />
      ) : (
        <Shimmering width={26} height={26} />
      )}
      <div className="flex flex-col ml-2 mr-auto pr-2 overflow-hidden">
        <BodyText className="truncate">{name}</BodyText>
        {networkIsActive && activeNode && <HelpText className="text-text-tertiary truncate">{activeNode.url}</HelpText>}
      </div>
      {networkIsActive && (
        <StatusLabel
          title={Status[connectionStatus].title(t)}
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
