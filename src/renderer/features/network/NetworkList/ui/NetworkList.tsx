import { type ReactNode, useEffect, useRef } from 'react';

import { useToggle } from '@/shared/lib/hooks';
import { Accordion, CaptionText, Counter } from '@/shared/ui';
import { type ExtendedChain } from '@/entities/network';
import { networksListUtils } from '../lib/networks-list-utils';

type Props = {
  title: string;
  query: string;
  networkList: ExtendedChain[];
  children: (network: ExtendedChain) => ReactNode;
};

export const NetworkList = ({ title, query, networkList, children }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [isListOpen, toggleList] = useToggle(true);

  useEffect(() => {
    if (!buttonRef.current) return;
    if (isListOpen || !query) return;

    buttonRef.current.click();
  }, [query]);

  if (networkList.length === 0) {
    return null;
  }

  const { success, connecting, error } = networksListUtils.getStatusMetrics(networkList);

  return (
    <Accordion isDefaultOpen={isListOpen}>
      <Accordion.Button buttonClass="py-1.5 px-2" ref={buttonRef} onClick={toggleList}>
        <div className="flex w-full items-center gap-x-1.5">
          <CaptionText as="h2" className="uppercase tracking-[0.75px] text-text-secondary">
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
