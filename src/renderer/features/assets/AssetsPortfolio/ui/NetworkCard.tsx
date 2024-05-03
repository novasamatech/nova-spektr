import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { BodyText, FootnoteText, Icon, Shimmering } from '@shared/ui';
import { cnTw, totalAmount } from '@shared/lib/utils';
import { Paths, createLink } from '@shared/routes';
import { Balance, TokenAsset } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { priceProviderModel } from '@entities/price';
import { CheckPermission, OperationType, walletModel } from '@entities/wallet';
import { ChainIcon } from '@entities/chain';
import { balanceModel } from '@entities/balance';
import { AssetBalance } from '@entities/asset';
import { networkModel } from '@entities/network';
import { AssetChain } from '../lib/types';

type Props = {
  chain: AssetChain;
  asset: TokenAsset;
};

export const NetworkCard = ({ chain, asset }: Props) => {
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);
  const balances = useUnit(balanceModel.$balances);
  const [balance, setBalances] = useState<Balance>();

  useEffect(() => {
    const chainBalance = balances.find((b) => b.chainId == chain.chainId && chain.assetId.toString() == b.assetId);

    setBalances(chainBalance);
  }, [balances]);

  return (
    <li role="button" tabIndex={0} className={cnTw('flex cursor-default flex-col rounded', 'transition-shadow')}>
      <div className="flex items-center py-1.5 px-2">
        <div className="flex items-center gap-x-2 px-2 py-1 mr-auto">
          <ChainIcon src={chains[chain.chainId].icon} name={chain.name} size={24} />
          <div>
            <BodyText>{chain.assetSymbol}</BodyText>
            <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
          </div>
        </div>
        <div className="flex flex-col items-end">
          {balance?.free ? (
            <>
              <AssetBalance value={totalAmount(balance)} asset={asset} showSymbol={false} />
              <AssetFiatBalance amount={totalAmount(balance)} asset={asset} />
            </>
          ) : (
            <div className="flex flex-col gap-y-1 items-end">
              <Shimmering width={82} height={20} />
              {fiatFlag && <Shimmering width={56} height={18} />}
            </div>
          )}
        </div>
        <div className="flex gap-x-2 ml-3">
          <CheckPermission operationType={OperationType.TRANSFER} wallet={activeWallet} accounts={activeAccounts}>
            <Link
              to={createLink(Paths.TRANSFER_ASSET, {}, { chainId: [chain.chainId], assetId: [chain.assetId] })}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="sendArrow" size={20} />
            </Link>
          </CheckPermission>
          <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet} accounts={activeAccounts}>
            <Link
              to={createLink(Paths.RECEIVE_ASSET, {}, { chainId: [chain.chainId], assetId: [chain.assetId] })}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="receiveArrow" size={20} />
            </Link>
          </CheckPermission>
        </div>
      </div>
    </li>
  );
};
