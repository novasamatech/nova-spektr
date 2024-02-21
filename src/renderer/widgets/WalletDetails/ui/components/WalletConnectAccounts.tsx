import { useUnit } from 'effector-react';
import { useMemo } from 'react';
import keyBy from 'lodash/keyBy';

import { wcDetailsUtils } from '../../lib/utils';
import { MultiAccountsList } from '@entities/wallet';
import { Button, FootnoteText, Icon, SmallTitleText } from '@shared/ui';
import wallet_connect_reconnect_webm from '@shared/assets/video/wallet_connect_reconnect.webm';
import wallet_connect_reconnect from '@shared/assets/video/wallet_connect_reconnect.mp4';
import { useI18n } from '@app/providers';
import { Account, AccountId, Chain, WalletConnectWallet } from '@shared/core';
import { wcDetailsModel } from '../../model/wc-details-model';
import { networkModel } from '@entities/network';

type AccountItem = {
  accountId: AccountId;
  chain: Chain;
};

type Props = {
  wallet: WalletConnectWallet;
  accounts: Account[];
};

export const WalletConnectAccounts = ({ wallet, accounts }: Props) => {
  const { t } = useI18n();

  const chains = Object.values(useUnit(networkModel.$chains));
  const reconnectStep = useUnit(wcDetailsModel.$reconnectStep);

  const accountsList = useMemo(() => {
    const accountsMap = keyBy(accounts, 'chainId');

    return chains.reduce<AccountItem[]>((acc, chain) => {
      const accountId = accountsMap[chain.chainId]?.accountId;

      if (accountId) {
        acc.push({ accountId, chain });
      }

      return acc;
    }, []);
  }, [accounts]);

  return (
    <>
      {wcDetailsUtils.isNotStarted(reconnectStep, wallet.isConnected) && (
        <MultiAccountsList accounts={accountsList} className="h-[377px]" headerClassName="pt-4 pb-2" />
      )}

      {wcDetailsUtils.isReadyToReconnect(reconnectStep, wallet.isConnected) && (
        <div className="flex flex-col h-[390px] w-[208px] justify-center items-center mx-auto mt-6">
          <Icon name="document" size={64} className="mb-6 text-icon-default" />
          <SmallTitleText className="mb-2">{t('walletDetails.walletConnect.disconnectedTitle')}</SmallTitleText>
          <FootnoteText className="mb-4 text-text-tertiary" align="center">
            {t('walletDetails.walletConnect.disconnectedDescription')}
          </FootnoteText>
          <Button size="sm" onClick={() => wcDetailsModel.events.confirmReconnectShown()}>
            {t('walletDetails.walletConnect.reconnectButton')}
          </Button>
        </div>
      )}

      {wcDetailsUtils.isReconnecting(reconnectStep) && (
        <div className="flex flex-col h-[419px] justify-center items-center">
          <video className="object-contain h-[420px]" autoPlay loop>
            <source src={wallet_connect_reconnect_webm} type="video/webm" />
            <source src={wallet_connect_reconnect} type="video/mp4" />
          </video>
        </div>
      )}
    </>
  );
};
