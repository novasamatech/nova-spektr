import { useState } from 'react';

import { ButtonBack, Icon, Input } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import NetworkList from '../NetworkList/NetworkList';

const Networks = () => {
  const [query, setQuery] = useState('');

  const { connections } = useNetworkContext();

  const filteredConnections = Object.values(connections).filter((connection) =>
    connection.name.toLowerCase().includes(query),
  );

  const [activeNetworks, disabledNetworks] = filteredConnections.reduce(
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

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">Settings</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">Networks</h1>
      </div>

      <section className="flex flex-col gap-y-5 mx-auto mb-5 w-full max-w-[740px] p-5 rounded-2lg bg-shade-2">
        <Input
          wrapperClass="!bg-shade-5 w-[300px]"
          placeholder="Search for a network..."
          prefixElement={<Icon name="search" className="w-5 h-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {disabledNetworks.length > 0 || activeNetworks.length > 0 ? (
          <>
            <NetworkList title="Disabled Networks" networkList={disabledNetworks}>
              <div className="flex items-center gap-x-1 relative">
                <Icon
                  className="absolute -top-[1px] -left-[5px] rounded-full bg-white border border-white text-neutral"
                  name="disableCutout"
                  size={10}
                />
                <p className="bg-shade-70 rounded-full w-5 h-5 pt-1 text-center text-white text-2xs">
                  {disabledNetworks.length}
                </p>
              </div>
            </NetworkList>

            <NetworkList isDefaultOpen title="Active Networks" networkList={activeNetworks}>
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
            </NetworkList>
          </>
        ) : (
          <div className="flex flex-col items-center mx-auto pt-12 pb-15">
            <Icon as="img" name="noResult" size={300} />
            <p className="text-center text-2xl font-bold leading-7 text-neutral">
              No networks with the entered name were found
            </p>
            <p className="text-center text-base text-neutral-variant">Try to search for another key</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Networks;
