import { useEffect, useState, ReactNode } from 'react';
import { useUnit } from 'effector-react';

import { ExtendedChain } from '@entities/network';
import { CaptionText, Counter, Accordion } from '@shared/ui';
import { networkListUtils, networkListModel } from '@features/networks/NetworkList';

type Props = {
  title: string;
  isDefaultOpen?: boolean;
  networkList: ExtendedChain[];
  children: (network: ExtendedChain) => ReactNode;
};

export const NetworkList = ({ title, isDefaultOpen, networkList, children }: Props) => {
  const [isListOpen, setIsListOpen] = useState(isDefaultOpen);
  const filterQuery = useUnit(networkListModel.$filterQuery);
  const { success, connecting, error } = networkListUtils.getMetrics(networkList);

  useEffect(() => {
    if (filterQuery) {
      setIsListOpen(true);
    } else {
      setIsListOpen(isDefaultOpen);
    }
  }, [filterQuery]);

  if (networkList.length === 0) return null;

  return (
    <Accordion isDefaultOpen={isListOpen}>
      <Accordion.Button buttonClass="py-1.5 px-2">
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
        <ul className="px-2">
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
