import cn from 'classnames';
import { useState } from 'react';

import { Button, ButtonBack, Icon, Input } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';

// const NETWORK_STATUS: Record<ConnectionStatus, (status: string) => ReactNode> = {
//   [ConnectionStatus.NONE]: () => null,
//   [ConnectionStatus.ERROR]: (status) => (
//     <>
//       <Icon className="text-error border border-error rounded-full bg-white" name="checkmark" size={10} />
//       <p className="text-xs font-semibold text-neutral-variant">{status}</p>
//     </>
//   ),
//   [ConnectionStatus.CONNECTED]: (status) => (
//     <>
//       <Icon className="text-success border border-success rounded-full bg-white" name="checkmark" size={10} />
//       <p className="text-xs font-semibold text-neutral-variant">{status}</p>
//     </>
//   ),
//   [ConnectionStatus.CONNECTING]: () => (
//     <>
//       <Icon className="text-shade-30" name="loader" size={10} />
//       <p className="text-xs font-semibold text-shade-30">Connecting...</p>
//     </>
//   ),
// };

const Networks = () => {
  const { connections, connectToNetwork } = useNetworkContext();

  const [query, setQuery] = useState('');
  const [isDisabledHidden, setIsDisabledHidden] = useState(false);
  const [isActiveHidden, setIsActiveHidden] = useState(false);

  const [activeNetworks, disabledNetworks] = Object.values(connections).reduce(
    (acc, c) => {
      c.connection.connectionType !== ConnectionType.DISABLED ? acc[0].push(c) : acc[1].push(c);

      return acc;
    },
    [[], []] as ExtendedChain[][],
  );

  const [connectedAmount, connectingAmount, errorAmount] = activeNetworks.reduce(
    (acc, { connection }) => {
      if (connection.connectionStatus === ConnectionStatus.CONNECTED) acc[0] += 1;
      if (connection.connectionStatus === ConnectionStatus.CONNECTING) acc[1] += 1;
      if (connection.connectionStatus === ConnectionStatus.ERROR) acc[2] += 1;

      return acc;
    },
    [0, 0, 0],
  );

  const onConnect = async (network: ExtendedChain) => {
    await connectToNetwork(network.chainId, ConnectionType.LIGHT_CLIENT);
    console.log(`🟢 ${network.name} Connected`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">Settings</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">Networks</h1>
      </div>

      <section className="flex flex-col gap-y-5 mx-auto w-full max-w-[740px] p-5 rounded-2lg bg-shade-2">
        <Input
          wrapperClass="!bg-shade-5 w-[300px]"
          placeholder="Search for a network..."
          prefixElement={<Icon name="search" className="w-5 h-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Disabled networks */}
        <div className="w-full mb-5 rounded-2lg bg-white shadow-surface">
          <div
            className={cn(
              'flex items-center justify-between border-b bg-white sticky top-0 z-10 rounded-t-2lg py-2.5 px-4',
              isDisabledHidden || !disabledNetworks.length ? 'rounded-2lg border-white' : 'border-shade-5',
            )}
          >
            <div className="flex items-center gap-x-2.5">
              <h2 className="flex items-center bg-white gap-x-2.5 text-neutral-variant">
                <Icon name="networkOff" />
                <p className="text-base font-semibold">Disabled Networks</p>
              </h2>
              <p className="bg-shade-70 rounded-full w-5 h-5 pt-1 text-center text-white text-2xs">
                {disabledNetworks.length}
              </p>
            </div>
            {disabledNetworks.length > 0 && (
              <div className="flex items-center">
                <Button
                  pallet="shade"
                  variant="text"
                  className="max-h-5 px-0"
                  onClick={() => setIsDisabledHidden(!isDisabledHidden)}
                >
                  <Icon name={isDisabledHidden ? 'down' : 'up'} size={20} />
                </Button>
              </div>
            )}
          </div>
          {!isDisabledHidden && (
            <ul>
              {disabledNetworks.map((network) => (
                <li
                  key={network.chainId}
                  className="flex items-center gap-x-2.5 px-[15px] py-3 border-b border-shade-5 last:border-b-0"
                >
                  <img src={network.icon} alt="" width={34} height={34} />
                  <div className="flex flex-col mr-auto">
                    <p className="text-xl text-neutral">{network.name}</p>
                  </div>
                  {/* TODO: create custom DropDown */}
                  <Button variant="outline" pallet="primary" onClick={() => onConnect(network)}>
                    Select connection type
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Connected networks */}
        <div className="w-full mb-5 rounded-2lg bg-white shadow-surface">
          <div
            className={cn(
              'flex items-center justify-between border-b bg-white sticky top-0 z-10 rounded-t-2lg py-2.5 px-4',
              isActiveHidden || !activeNetworks.length ? 'rounded-2lg border-white' : 'border-shade-5',
            )}
          >
            <div className="flex items-center gap-x-2.5">
              <h2 className="flex items-center bg-white gap-x-2.5 text-neutral-variant">
                <Icon name="networkOn" />
                <p className="text-base font-semibold">Active Networks</p>
              </h2>
              <div className="flex gap-x-3">
                <div className="flex items-center gap-x-1 relative">
                  <Icon
                    className="absolute -top-[1px] -left-[5px] rounded-full bg-white border border-white text-success"
                    name="checkmarkCutout"
                    size={10}
                  />
                  <p className="bg-success rounded-full w-5 h-5 pt-1 text-center text-white text-2xs">
                    {connectedAmount}
                  </p>
                  <p className="text-xs font-semibold text-neutral-variant">Connected</p>
                </div>
                <div className="flex items-center gap-x-1 relative">
                  <Icon
                    className="absolute -top-[1px] -left-[5px] rounded-full bg-white border border-white text-error"
                    name="closeCutout"
                    size={10}
                  />
                  <p className="bg-error rounded-full w-5 h-5 pt-1 text-center text-white text-2xs">{errorAmount}</p>
                  <p className="text-xs font-semibold text-neutral-variant">Connection error</p>
                </div>
                <div className="flex items-center gap-x-1 relative">
                  <Icon
                    className="absolute -top-[1px] -left-[5px] rounded-full bg-white border border-white text-neutral-variant"
                    name="loaderCutout"
                    size={10}
                  />
                  <p className="bg-shade-30 rounded-full w-5 h-5 pt-1 text-center text-white text-2xs">
                    {connectingAmount}
                  </p>
                  <p className="text-xs font-semibold text-shade-30">Connecting</p>
                </div>
              </div>
            </div>
            {activeNetworks.length > 0 && (
              <div className="flex items-center">
                <Button
                  pallet="shade"
                  variant="text"
                  className="max-h-5 px-0"
                  onClick={() => setIsActiveHidden(!isActiveHidden)}
                >
                  <Icon name={isActiveHidden ? 'down' : 'up'} size={20} />
                </Button>
              </div>
            )}
          </div>
          {!isActiveHidden && (
            <ul>
              {activeNetworks.map(({ chainId, icon, name, connection }) => (
                <li
                  key={chainId}
                  className="flex items-center gap-x-2.5 px-[15px] py-3 border-b border-shade-5 last:border-b-0"
                >
                  <img src={icon} alt="" width={34} height={34} />
                  <div className="flex flex-col mr-auto">
                    <p className="text-xl text-neutral">{name}</p>
                    <div className="flex items-center gap-x-1">
                      {connection.connectionStatus}
                      {/*{NETWORK_STATUS[connection.connectionStatus]('TEST')}*/}
                    </div>
                  </div>
                  {/* TODO: create custom DropDown */}
                  <Button variant="outline" pallet="primary">
                    Auto Balance
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default Networks;
