import { type ReactNode, useEffect } from 'react';

import { useToggle } from '@/shared/lib/hooks';
import { CaptionText, Counter } from '@/shared/ui';
import { Accordion, Box } from '@/shared/ui-kit';
import { type ExtendedChain } from '@/entities/network';
import { networksListUtils } from '../lib/networks-list-utils';

type Props = {
  title: string;
  query: string;
  networkList: ExtendedChain[];
  children: (network: ExtendedChain) => ReactNode;
};

export const NetworkList = ({ title, query, networkList, children }: Props) => {
  const [isListOpen, toggleList] = useToggle(true);

  useEffect(() => {
    if (isListOpen || !query) return;

    toggleList();
  }, [query]);

  if (networkList.length === 0) {
    return null;
  }

  const { success, connecting, error } = networksListUtils.getStatusMetrics(networkList);

  return (
    <Accordion initialOpen={isListOpen} onToggle={toggleList}>
      <Box padding={[1.5, 2]}>
        <Accordion.Trigger>
          <div className="flex w-full items-center gap-x-1.5">
            <CaptionText as="h2" className="tracking-[0.75px] text-text-secondary uppercase">
              {title}
            </CaptionText>
            <Counter variant="waiting">{networkList.length}</Counter>

            <div className="ml-auto flex items-center gap-x-1.5">
              {success > 0 && <Counter variant="success">{success}</Counter>}
              {connecting > 0 && <Counter variant="waiting">{connecting}</Counter>}
              {error > 0 && <Counter variant="error">{error}</Counter>}
            </div>
          </div>
        </Accordion.Trigger>
      </Box>
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
