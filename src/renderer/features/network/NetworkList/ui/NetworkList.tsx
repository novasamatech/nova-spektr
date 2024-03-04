import { ReactNode, useEffect, useRef } from 'react';

import { ExtendedChain } from '@entities/network';
import { CaptionText, Counter, Accordion } from '@shared/ui';
import { networksListUtils } from '../lib/networks-list-utils';
import { useToggle } from '@shared/lib/hooks';

type Props = {
  title: string;
  query: string;
  networkList: ExtendedChain[];
  children: (network: ExtendedChain) => ReactNode;
  isDefaultOpen?: boolean;
};

export const NetworkList = ({ title, query, networkList, children, isDefaultOpen = true }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [isListOpen, toggleList] = useToggle(isDefaultOpen);

  useEffect(() => {
    if (!buttonRef.current) return;
    if (isListOpen || !query) return;

    buttonRef.current.click();
  }, [query]);

  if (networkList.length === 0) return null;

  const { success, connecting, error } = networksListUtils.getStatusMetrics(networkList);

  return (
    <Accordion isDefaultOpen={isListOpen}>
      <Accordion.Button buttonClass="py-1.5 px-2" ref={buttonRef} onClick={toggleList}>
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
