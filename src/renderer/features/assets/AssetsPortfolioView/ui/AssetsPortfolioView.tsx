import { useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { AssetsListView, EmptyAssetsState } from '@/entities/asset';
import { priceProviderModel } from '@/entities/price';
import { walletModel, walletUtils } from '@/entities/wallet';
import { portfolioModel } from '../model/portfolio-model';

import { TokenBalance } from './TokenBalance';
import { TokenBalanceList } from './TokenBalanceList';

const getColStyle = (wallet?: Wallet): string => {
  if (!wallet) {
    return '';
  }
  if (walletUtils.isWatchOnly(wallet)) {
    return 'grid-cols-[1fr,100px,105px,10px]';
  }

  return 'grid-cols-[1fr,100px,108px,60px]';
};

export const AssetsPortfolioView = () => {
  const { t } = useI18n();

  const activeView = useUnit(portfolioModel.$activeView);
  const sortedTokens = useUnit(portfolioModel.$sortedTokens);
  const tokensPopulated = useUnit(portfolioModel.$tokensPopulated);
  const accounts = useUnit(portfolioModel.$accounts);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const wallet = useUnit(walletModel.$activeWallet);

  const { list, isLoading } = useDeferredList({
    list: sortedTokens,
    isLoading: !tokensPopulated,
    forceFirstRender: true,
  });

  if (activeView !== AssetsListView.TOKEN_CENTRIC || accounts.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center gap-y-2 py-4">
      {list.length > 0 && (
        <div className={cnTw('grid w-[736px] items-center pl-9.5 pr-4', getColStyle(wallet))}>
          <FootnoteText className="text-text-tertiary">{t('balances.token')}</FootnoteText>
          <FootnoteText className="text-text-tertiary" align="right">
            {fiatFlag && t('balances.price')}
          </FootnoteText>
          <FootnoteText className="col-end-4 text-text-tertiary" align="right">
            {t('balances.balance')}
          </FootnoteText>
        </div>
      )}

      <ul className="flex min-h-full w-full flex-col items-center gap-y-2">
        {list.map((asset) => (
          <li key={`${asset.priceId || ''}${asset.symbol}`} className="w-full max-w-[736px]">
            {asset.chains.length === 1 ? <TokenBalance asset={asset} /> : <TokenBalanceList asset={asset} />}
          </li>
        ))}

        {isLoading && (
          <Box fillContainer verticalAlign="center" horizontalAlign="center">
            <Loader color="primary" size={32} />
          </Box>
        )}

        <EmptyAssetsState />
      </ul>
    </div>
  );
};
