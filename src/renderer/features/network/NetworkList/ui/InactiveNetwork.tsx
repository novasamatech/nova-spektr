import { type PropsWithChildren } from 'react';

import { BodyText, HelpText } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { type ExtendedChain } from '@/entities/network';

type Props = {
  networkItem: ExtendedChain;
};

export const InactiveNetwork = ({ networkItem, children }: PropsWithChildren<Props>) => {
  return (
    <div className="flex items-center py-3">
      <ChainIcon chain={networkItem} size={26} />
      <div className="mr-auto ml-2 flex flex-col overflow-hidden pr-2">
        <BodyText className="truncate">{networkItem.name}</BodyText>
        {networkItem.connection.activeNode && (
          <HelpText className="truncate text-text-tertiary">{networkItem.connection.activeNode.url}</HelpText>
        )}
      </div>
      {children}
    </div>
  );
};
