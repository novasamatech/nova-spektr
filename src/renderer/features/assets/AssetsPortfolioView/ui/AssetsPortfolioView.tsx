import { useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { EmptyAssetsState } from '@/entities/asset';
import { walletUtils } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { walletSelect } from '@/aggregates/wallet-select';
import { portfolioModel } from '../model/portfolio-model';

import { TokenBalance } from './TokenBalance';
import { TokenBalanceList } from './TokenBalanceList';

const getColStyle = (wallet: Wallet | null): string => {
  if (!wallet) {
    return '';
  }
  if (walletUtils.isWatchOnly(wallet)) {
    return 'grid-cols-[1fr_100px_105px_10px]';
  }

  return 'grid-cols-[1fr_100px_108px_60px]';
};

export const AssetsPortfolioView = () => {
  const { t } = useI18n();

  const sortedTokens = useUnit(portfolioModel.$sortedTokens);
  const portfolioLoading = useUnit(portfolioModel.$isLoading);
  const emptyStateAvailable = useUnit(portfolioModel.$emptyStateAvailable);
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const wallet = useUnit(walletSelect.$selectedWallet);

  const { list, isLoading } = useDeferredList({
    list: sortedTokens,
    isLoading: portfolioLoading,
    forceFirstRender: true,
  });
  const shouldShowEmptyState = emptyStateAvailable && list.length === 0 && !isLoading;

  return (
    <div className="flex min-h-full w-full flex-col items-center gap-y-2 py-4">
      {list.length > 0 && (
        <div className={cnTw('grid w-[736px] items-center px-9', getColStyle(wallet))}>
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
          <li
            key={`${asset.priceId || ''}-${asset.symbol}-${asset.chains[0]?.chainId}`}
            className="w-full max-w-[736px]"
          >
            {asset.chains.length === 1 ? <TokenBalance asset={asset} /> : <TokenBalanceList asset={asset} />}
          </li>
        ))}

        {isLoading && (
          <Box fillContainer verticalAlign="center" horizontalAlign="center">
            <Loader color="primary" size={32} />
          </Box>
        )}

        {shouldShowEmptyState && <EmptyAssetsState />}
      </ul>
    </div>
  );
};
