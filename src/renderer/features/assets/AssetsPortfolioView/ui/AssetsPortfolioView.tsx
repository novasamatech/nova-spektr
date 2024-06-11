import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Icon, BodyText, FootnoteText } from '@shared/ui';
import { priceProviderModel } from '@entities/price';
import { walletModel } from '@entities/wallet';
import { Wallet, WalletType } from '@shared/core';
import { AssetsListView } from '@entities/asset';
import { TokenBalanceList } from './TokenBalanceList';
import { TokenBalance } from './TokenBalance';
import { portfolioModel } from '../model/portfolio-model';

const getColStyle = (wallet?: Wallet): string => {
  if (!wallet) return '';
  const colStyleMap: Partial<Record<WalletType, string>> = {
    [WalletType.WATCH_ONLY]: 'grid-cols-[1fr,100px,105px]',
    [WalletType.PROXIED]: 'grid-cols-[1fr,100px,105px,30px]',
  };

  return colStyleMap[wallet.type] || 'grid-cols-[1fr,100px,110px,50px]';
};

export const AssetsPortfolioView = () => {
  const { t } = useI18n();

  const activeView = useUnit(portfolioModel.$activeView);
  const sortedTokens = useUnit(portfolioModel.$sortedTokens);
  const accounts = useUnit(portfolioModel.$accounts);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const wallet = useUnit(walletModel.$activeWallet);

  if (activeView !== AssetsListView.TOKEN_CENTRIC || accounts.length === 0) return null;

  const colStyle = getColStyle(wallet);

  return (
    <div className="flex flex-col gap-y-2 items-center w-full py-4">
      <div className={`grid items-center w-[548px] pl-[35px] pr-4 ${colStyle}`}>
        <FootnoteText className="text-text-tertiary">{t('balances.token')}</FootnoteText>
        <FootnoteText className="text-text-tertiary" align="right">
          {fiatFlag && t('balances.price')}
        </FootnoteText>
        <FootnoteText className="text-text-tertiary col-end-4" align="right">
          {t('balances.balance')}
        </FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-4 items-center w-full">
        {sortedTokens.map((asset) => (
          <li key={`${asset.priceId || ''}${asset.symbol}`} className="w-[548px]">
            {asset.chains.length === 1 ? <TokenBalance asset={asset} /> : <TokenBalanceList asset={asset} />}
          </li>
        ))}

        <div className="hidden only:flex flex-col items-center justify-center gap-y-8 w-full h-full">
          <Icon as="img" name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
          <BodyText align="center" className="text-text-tertiary">
            {t('balances.emptyStateLabel')}
            <br />
            {t('balances.emptyStateDescription')}
          </BodyText>
        </div>
      </ul>
    </div>
  );
};
