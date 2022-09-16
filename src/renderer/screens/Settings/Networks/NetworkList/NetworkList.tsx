import cn from 'classnames';
import { PropsWithChildren } from 'react';

import { Button, Icon } from '@renderer/components/ui';
import useToggle from '@renderer/hooks/useToggle';
import { ExtendedChain } from '@renderer/services/network/common/types';
import NetworkItem from '../NetworkItem/NetworkItem';

type Props = {
  title: string;
  isDefaultOpen?: boolean;
  networkList: ExtendedChain[];
};

const NetworkList = ({ title, isDefaultOpen, networkList, children }: PropsWithChildren<Props>) => {
  const [isListOpen, toggleList] = useToggle(!isDefaultOpen);

  if (networkList.length === 0) return null;

  return (
    <div className="w-full rounded-2lg bg-white shadow-surface">
      <div
        className={cn(
          'flex items-center justify-between border-b bg-white sticky top-0 z-10 rounded-t-2lg py-2.5 px-4',
          isListOpen || !networkList.length ? 'rounded-2lg border-white' : 'border-shade-5',
        )}
      >
        <div className="flex items-center gap-x-2.5">
          <h2 className="flex items-center bg-white gap-x-2.5 text-neutral-variant">
            <Icon name="networkOff" />
            <p className="text-base font-semibold">{title}</p>
          </h2>
        </div>
        <div className="flex items-center gap-x-2.5">
          {children}
          {networkList.length > 0 && (
            <div className="flex items-center">
              <Button pallet="shade" variant="text" className="max-h-5 px-0" onClick={toggleList}>
                <Icon name={isListOpen ? 'down' : 'up'} size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>
      {!isListOpen && (
        <ul>
          {networkList.map((network) => (
            <NetworkItem key={network.chainId} networkItem={network} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default NetworkList;
