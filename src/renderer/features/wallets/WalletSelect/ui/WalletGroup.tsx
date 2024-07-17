import { Accordion, CaptionText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { type Wallet, type WalletFamily, WalletType } from '@shared/core';
import { WalletCardMd, WalletIcon, walletUtils } from '@entities/wallet';
import { WalletFiatBalance } from './WalletFiatBalance';
import { walletSelectModel } from '../model/wallet-select-model';
import { ProxiedTooltip } from './ProxiedTooltip';

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
        <div className="flex gap-x-2 items-center">
          <WalletIcon type={type} />
          <CaptionText className="text-text-secondary  font-semibold uppercase">
            {t(GroupLabels[type as WalletFamily])}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{wallets.length}</CaptionText>
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
                  <WalletFiatBalance walletId={wallet.id} className="text-help-text max-w-[215px] truncate" />
                }
                prefix={
                  wallet.isActive ? (
                    <Icon name="checkmark" className="text-icon-accent shrink-0" size={20} />
                  ) : (
                    <div className="w-5 h-5 row-span-2 shrink-0" />
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
