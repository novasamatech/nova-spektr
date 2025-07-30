import { memo } from 'react';
import { useLinkClickHandler } from 'react-router-dom';

import { type ChainId, type Wallet } from '@/shared/core';
import { Paths, createLink } from '@/shared/routes';
import { IconButton } from '@/shared/ui';
import { CheckPermission, OperationType } from '@/entities/wallet';

type Props = {
  assetId: number;
  chainId: ChainId;
  wallet: Wallet | null;
};

export const AssetLinks = memo(({ assetId, chainId, wallet }: Props) => {
  const openSend = useLinkClickHandler<HTMLButtonElement>(
    createLink(Paths.TRANSFER_ASSET, {}, { chainId: [chainId], assetId: [assetId] }),
  );
  const openReceive = useLinkClickHandler<HTMLButtonElement>(
    createLink(Paths.RECEIVE_ASSET, {}, { chainId: [chainId], assetId: [assetId] }),
  );

  return (
    <div className="ml-4 flex gap-x-2">
      <CheckPermission operationType={OperationType.TRANSFER} wallet={wallet}>
        <IconButton
          name="sendArrow"
          size={20}
          onClick={(e) => {
            e.stopPropagation();
            openSend(e);
          }}
        />
      </CheckPermission>
      <CheckPermission operationType={OperationType.RECEIVE} wallet={wallet}>
        <IconButton
          name="receiveArrow"
          size={20}
          onClick={(e) => {
            e.stopPropagation();
            openReceive(e);
          }}
        />
      </CheckPermission>
    </div>
  );
});
