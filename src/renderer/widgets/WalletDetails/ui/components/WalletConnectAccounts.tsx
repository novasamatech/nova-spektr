import { useUnit } from 'effector-react';
import { useMemo } from 'react';
import { keyBy } from 'lodash';

import { wcDetailsUtils } from '@widgets/WalletDetails/lib/utils';
import { MultiAccountsList } from '@entities/wallet';
import { Button, FootnoteText, Icon, SmallTitleText } from '@shared/ui';
import wallet_connect_reconnect_webm from '@shared/assets/video/wallet_connect_reconnect.webm';
import wallet_connect_reconnect from '@shared/assets/video/wallet_connect_reconnect.mp4';
import { useI18n } from '@app/providers';
import { Account, AccountId, Chain, WalletConnectWallet } from '@shared/core';
import { wcDetailsModel } from '@widgets/WalletDetails/model/wc-details-model';
import { chainsService } from '@entities/network';

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

  const reconnectStep = useUnit(wcDetailsModel.$reconnectStep);

  // TODO: Rework with https://app.clickup.com/t/8692ykm3y
  const accountsList = useMemo(() => {
    const sortedChains = chainsService.getChainsData({ sort: true });

    const accountsMap = keyBy(accounts, 'chainId');

    return sortedChains.reduce<AccountItem[]>((acc, chain) => {
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
        <MultiAccountsList accounts={accountsList} className="h-[367px]" headerClassName="pt-4 pb-2" />
      )}

      {wcDetailsUtils.isReadyToReconnect(reconnectStep, wallet.isConnected) && (
        <div className="flex flex-col h-[404px] justify-center items-center">
          <Icon name="document" size={64} className="mb-6 text-icon-default" />
          <SmallTitleText className="mb-2">{t('walletDetails.walletConnect.disconnectedTitle')}</SmallTitleText>
          <FootnoteText className="mb-4 text-text-tertiary">
            {t('walletDetails.walletConnect.disconnectedDescription')}
          </FootnoteText>
          <Button onClick={() => wcDetailsModel.events.confirmReconnectShown()}>
            {t('walletDetails.walletConnect.reconnectButton')}
          </Button>
        </div>
      )}

      {wcDetailsUtils.isReconnecting(reconnectStep) && (
        <div className="flex flex-col h-[409px] justify-center items-center">
          <video className="object-contain h-[409px]" autoPlay loop>
            <source src={wallet_connect_reconnect_webm} type="video/webm" />
            <source src={wallet_connect_reconnect} type="video/mp4" />
          </video>
        </div>
      )}
    </>
  );
};
