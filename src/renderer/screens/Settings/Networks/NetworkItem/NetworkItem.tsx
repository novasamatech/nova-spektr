import { ReactNode } from 'react';

import { Icon } from '@renderer/components/ui';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import SelectConnection from '../SelectConnection/SelectConnection';

const NETWORK_CONNECTION_STATUS: Record<ConnectionStatus, (type: ConnectionType, nodeUrl: string) => ReactNode> = {
  [ConnectionStatus.NONE]: () => null,
  [ConnectionStatus.ERROR]: (type: ConnectionType, nodeUrl: string) => (
    <div className="flex items-center gap-x-1">
      <Icon className="text-error border border-error rounded-full bg-white p-[1px]" name="checkmark" size={12} />
      <p className="text-xs font-semibold text-neutral-variant">
        {type === ConnectionType.LIGHT_CLIENT && 'Light client'}
        {type === ConnectionType.RPC_NODE && nodeUrl}
      </p>
    </div>
  ),
  [ConnectionStatus.CONNECTED]: (type: ConnectionType, nodeUrl: string) => (
    <div className="flex items-center gap-x-1">
      <Icon className="text-success border border-success rounded-full bg-white p-[1px]" name="checkmark" size={12} />
      <p className="text-xs font-semibold text-neutral-variant">
        {type === ConnectionType.LIGHT_CLIENT && 'Connected'}
        {type === ConnectionType.RPC_NODE && nodeUrl}
      </p>
    </div>
  ),
  [ConnectionStatus.CONNECTING]: () => (
    <div className="flex items-center gap-x-1">
      <Icon className="text-shade-30 animate-spin" name="loader" size={14} />
      <p className="text-xs font-semibold text-shade-30">Connecting...</p>
    </div>
  ),
};

type Props = {
  networkItem: ExtendedChain;
};

const NetworkItem = ({ networkItem }: Props) => {
  const { chainId, icon, name, connection } = networkItem;
  const { connectionType, connectionStatus, activeNode } = connection;

  return (
    <li key={chainId} className="flex items-center gap-x-2.5 px-[15px] py-3 border-b border-shade-5 last:border-b-0">
      <img src={icon} alt="" width={34} height={34} />
      <div className="flex flex-col mr-auto">
        <p className="text-xl leading-5 text-neutral">{name}</p>
        {NETWORK_CONNECTION_STATUS[connectionStatus](connectionType, activeNode?.url || '')}
      </div>

      <SelectConnection networkItem={networkItem} />
    </li>
  );
};

export default NetworkItem;
