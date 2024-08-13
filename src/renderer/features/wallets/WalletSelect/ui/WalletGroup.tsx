import { useI18n } from '@app/providers';
import { type Wallet, type WalletFamily, WalletType } from '@shared/core';
import { Accordion, CaptionText, Icon } from '@shared/ui';
import { WalletCardMd, WalletIcon, walletUtils } from '@entities/wallet';
import { walletSelectModel } from '../model/wallet-select-model';

import { ProxiedTooltip } from './ProxiedTooltip';
import { WalletFiatBalance } from './WalletFiatBalance';

export const GroupLabels: Record<WalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.PROXIED]: 'wallets.proxiedLabel',
};

type Props = {
  type: WalletFamily;
  wallets: Wallet[];
};

export const WalletGroup = ({ type, wallets }: Props) => {
  const { t } = useI18n();

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="px-2 py-1.5 my-2 rounded hover:bg-action-background-hover focus:bg-action-background-hover">
        <div className="flex items-center gap-x-2">
          <WalletIcon type={type} />
          <CaptionText className="font-semibold uppercase text-text-secondary">
            {t(GroupLabels[type as WalletFamily])}
          </CaptionText>
          <CaptionText className="font-semibold text-text-tertiary">{wallets.length}</CaptionText>
          {walletUtils.isProxied(wallets[0]) && <ProxiedTooltip />}
        </div>
      </Accordion.Button>
      <Accordion.Content>
        <ul>
          {wallets.map((wallet) => (
            <li key={wallet.id} className="mb-2">
              <WalletCardMd
                hideIcon
                wallet={wallet}
                description={
                  <WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />
                }
                prefix={
                  wallet.isActive ? (
                    <Icon name="checkmark" className="shrink-0 text-icon-accent" size={20} />
                  ) : (
                    <div className="row-span-2 h-5 w-5 shrink-0" />
                  )
                }
                onClick={() => walletSelectModel.events.walletSelected(wallet.id)}
                onInfoClick={() => walletSelectModel.events.walletIdSet(wallet.id)}
              />
            </li>
          ))}
        </ul>
      </Accordion.Content>
    </Accordion>
  );
};
