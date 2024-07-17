import { type PropsWithChildren } from 'react';

import { type ExtendedChain } from '@entities/network';
import { BodyText, HelpText } from '@shared/ui';
import { ChainIcon } from '@entities/chain';

type Props = {
  networkItem: ExtendedChain;
};

export const InactiveNetwork = ({ networkItem, children }: PropsWithChildren<Props>) => {
  return (
    <div className="flex items-center py-3">
      <ChainIcon src={networkItem.icon} name={networkItem.name} size={26} />
      <div className="flex flex-col ml-2 mr-auto pr-2 overflow-hidden">
        <BodyText className="truncate">{networkItem.name}</BodyText>
        {networkItem.connection.activeNode && (
          <HelpText className="text-text-tertiary truncate">{networkItem.connection.activeNode.url}</HelpText>
        )}
      </div>
      {children}
    </div>
  );
};
