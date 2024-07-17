import { useUnit } from 'effector-react';
import { Link } from 'react-router-dom';

import type { ChainId } from '@shared/core';
import { Paths, createLink } from '@shared/routes';
import { Icon } from '@shared/ui';

import { CheckPermission, OperationType, walletModel } from '@entities/wallet';

type Props = {
  assetId: number;
  chainId: ChainId;
};

export const AssetLinks = ({ assetId, chainId }: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);

  return (
    <div className="flex gap-x-2 ml-3">
      <CheckPermission operationType={OperationType.TRANSFER} wallet={activeWallet}>
        <Link
          to={createLink(Paths.TRANSFER_ASSET, {}, { chainId: [chainId], assetId: [assetId] })}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="sendArrow" size={20} />
        </Link>
      </CheckPermission>
      <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet}>
        <Link
          to={createLink(Paths.RECEIVE_ASSET, {}, { chainId: [chainId], assetId: [assetId] })}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="receiveArrow" size={20} />
        </Link>
      </CheckPermission>
    </div>
  );
};
