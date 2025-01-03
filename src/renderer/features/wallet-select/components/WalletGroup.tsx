import { type Wallet, type WalletFamily, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { CaptionText, Icon, IconButton } from '@/shared/ui';
import { Accordion } from '@/shared/ui-kit';
import { WalletCardMd, WalletIcon, walletUtils } from '@/entities/wallet';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';
import { walletSelectModel } from '../model/wallet-select-model';

import { ProxiedTooltip } from './ProxiedTooltip';

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const GROUP_LABELS: Record<WalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.FLEXIBLE_MULTISIG]: 'wallets.flexibleMultisigLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.PROXIED]: 'wallets.proxiedLabel',
};

type Props = {
  type: WalletFamily;
  wallets: Wallet[];
  onInfoClick: (wallet: Wallet) => void;
};

export const WalletGroup = ({ type, wallets, onInfoClick }: Props) => {
  const { t } = useI18n();

  return (
    <div className="pt-1">
      <Accordion initialOpen>
        <Accordion.Trigger>
          <div className="flex items-center gap-2">
            <WalletIcon type={type} />
            <CaptionText className="font-semibold uppercase text-text-secondary">
              {t(GROUP_LABELS[type as WalletFamily])}
            </CaptionText>
            <CaptionText className="font-semibold text-text-tertiary">{wallets.length}</CaptionText>
            {walletUtils.isProxied(wallets[0]) && <ProxiedTooltip />}
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <ul className="flex flex-col gap-1 pt-1">
            {wallets.map(wallet => (
              <li key={wallet.id}>
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
                >
                  <IconButton name="details" onClick={() => onInfoClick(wallet)} />
                </WalletCardMd>
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </div>
  );
};
