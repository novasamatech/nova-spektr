import { useUnit } from 'effector-react';
import { keyBy } from 'lodash';
import { memo, useMemo } from 'react';

import wallet_connect_reconnect from '@/shared/assets/video/wallet_connect_reconnect.mp4';
import wallet_connect_reconnect_webm from '@/shared/assets/video/wallet_connect_reconnect.webm';
import { type Chain, type WalletConnectGroup, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { ChainAccountsList } from '@/shared/ui-entities';
import { networkModel } from '@/entities/network';
import { WalletConnectQrCode } from '@/features/wallet-connect-wallet-pairing';
import { wcDetailsUtils } from '../../lib/utils';
import { walletConnectReconnect } from '../../model/walletConnectReconnect';

type AccountItem = [chain: Chain, accountId: AccountId];

type Props = {
  wallet: WalletConnectGroup;
};

export const WalletConnectAccounts = memo(({ wallet }: Props) => {
  const { t } = useI18n();

  const chains = Object.values(useUnit(networkModel.$chains));
  const connected = useUnit(walletConnectReconnect.$connected);
  const reconnectStep = useUnit(walletConnectReconnect.$reconnectStep);
  const reconnectUri = useUnit(walletConnectReconnect.$reconnectUri);

  const accountsList = useMemo(() => {
    const accountsMap = keyBy(wallet.accounts, 'chainId');

    return chains.reduce<AccountItem[]>((acc, chain) => {
      const accountId = accountsMap[chain.chainId]?.accountId;

      if (accountId) {
        acc.push([chain, accountId]);
      }

      return acc;
    }, []);
  }, [wallet, chains]);

  const walletName = wallet.type === WalletType.NOVA_WALLET ? 'Nova Wallet' : 'WalletConnect';

  return (
    <>
      {wcDetailsUtils.isNotStarted(reconnectStep, connected) && <ChainAccountsList accounts={accountsList} />}

      {wcDetailsUtils.isReadyToReconnect(reconnectStep, connected) && (
        <div className="mx-auto flex h-[390px] w-[208px] flex-col items-center justify-center">
          <Icon name="document" size={64} className="mb-6 text-icon-default" />
          <SmallTitleText className="mb-2">{t('walletDetails.walletConnect.disconnectedTitle')}</SmallTitleText>
          <FootnoteText className="mb-4 text-text-tertiary" align="center">
            {t('walletDetails.walletConnect.disconnectedDescription', { walletName })}
          </FootnoteText>
          <Button size="sm" onClick={() => walletConnectReconnect.start()}>
            {t('walletDetails.walletConnect.reconnectButton')}
          </Button>
        </div>
      )}

      {wcDetailsUtils.isReconnecting(reconnectStep) && !reconnectUri && (
        <div className="flex h-[400px] flex-col items-center justify-center">
          <video className="h-[400px] object-contain" autoPlay loop>
            <source src={wallet_connect_reconnect_webm} type="video/webm" />
            <source src={wallet_connect_reconnect} type="video/mp4" />
          </video>
        </div>
      )}

      {wcDetailsUtils.isReconnecting(reconnectStep) && !!reconnectUri && (
        <div className="py-4">
          <SmallTitleText className="pb-4 text-center">
            {t('walletDetails.walletConnect.signTitle', { walletName })}
          </SmallTitleText>

          <WalletConnectQrCode
            uri={reconnectUri}
            type={wallet.type === WalletType.NOVA_WALLET ? 'novawallet' : 'walletconnect'}
          />
        </div>
      )}
    </>
  );
});
