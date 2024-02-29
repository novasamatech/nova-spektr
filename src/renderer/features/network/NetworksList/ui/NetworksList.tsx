import { ReactNode } from 'react';

import { ExtendedChain } from '@entities/network';
import { CaptionText, Counter, Accordion } from '@shared/ui';
import { networksListUtils } from '../lib/networks-list-utils';

type Props = {
  title: string;
  isDefaultOpen?: boolean;
  networkList: ExtendedChain[];
  children: (network: ExtendedChain) => ReactNode;
};

export const NetworksList = ({ title, isDefaultOpen, networkList, children }: Props) => {
  if (networkList.length === 0) return null;

  const { success, connecting, error } = networksListUtils.getMetrics(networkList);

  return (
    <Accordion isDefaultOpen={isDefaultOpen}>
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
