import { useEffect, useState, ReactNode } from 'react';

import { ExtendedChain } from '@renderer/services/network/common/types';
import { CaptionText, Counter, Accordion } from '@renderer/components/ui-redesign';
import { ConnectionType, ConnectionStatus } from '@renderer/domain/connection';

type Props = {
  title: string;
  isDefaultOpen?: boolean;
  query?: string;
  networkList: ExtendedChain[];
  children: (network: ExtendedChain) => ReactNode;
};

export const NetworkList = ({ title, isDefaultOpen, query, networkList, children }: Props) => {
  const [isListOpen, setIsListOpen] = useState(isDefaultOpen);

  useEffect(() => {
    if (query) {
      setIsListOpen(Boolean(query));
    } else {
      setIsListOpen(isDefaultOpen);
    }
  }, [query]);

  if (networkList.length === 0) return null;

  const [success, connecting, error] = networkList.reduce(
    (acc, network) => {
      if (network.connection.connectionType === ConnectionType.DISABLED) return acc;

      if (network.connection.connectionStatus === ConnectionStatus.CONNECTED) acc[0] += 1;
      if (network.connection.connectionStatus === ConnectionStatus.CONNECTING) acc[1] += 1;
      if (network.connection.connectionStatus === ConnectionStatus.ERROR) acc[2] += 1;

      return acc;
    },
    [0, 0, 0],
  );

  return (
    <Accordion isOpen={isListOpen}>
      <Accordion.Button className="py-1.5">
        <div className="flex items-center gap-x-1.5 w-full">
          <CaptionText as="h2" className="uppercase text-text-secondary tracking-[0.75px]">
            {title}
          </CaptionText>
          <Counter variant="waiting">{networkList.length}</Counter>

          <div className="ml-auto flex items-center gap-x-1.5">
            {success > 0 && <Counter variant="success">{success}</Counter>}
            {connecting > 0 && <Counter variant="waiting">{connecting}</Counter>}
            {error > 0 && <Counter variant="error">{error}</Counter>}
          </div>
        </div>
      </Accordion.Button>
      <Accordion.Content>
        <ul>
          {networkList.map((network) => (
            <li key={network.chainId} className="border-b border-b-filter-border last:border-0">
              {children(network)}
            </li>
          ))}
        </ul>
      </Accordion.Content>
    </Accordion>
  );
};
