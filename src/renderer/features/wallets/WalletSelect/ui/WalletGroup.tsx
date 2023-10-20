import { Accordion, CaptionText, BodyText, Icon, IconButton } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Wallet, WalletFamily, WalletType } from '@renderer/shared/core';
import { WalletIcon, walletModel } from '@renderer/entities/wallet';
import { cnTw } from '@renderer/shared/lib/utils';
import { WalletFiatBalance } from './WalletFiatBalance';
import { walletSelectModel } from '../model/wallet-select-model';

export const GroupLabels: Record<WalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
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
          <CaptionText className="text-text-secondary  font-semibold uppercase">{t(GroupLabels[type])}</CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{wallets.length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content>
        <ul>
          {wallets.map((wallet) => (
            <li key={wallet.id} className="mb-2">
              {/* TODO: should become a part of WalletCard */}
              <div
                className={cnTw(
                  'group relative flex items-center transition-colors',
                  'hover:bg-action-background-hover focus-within:bg-action-background-hover',
                )}
              >
                <button
                  className="w-full flex gap-x-2 items-center py-1.5 px-2 rounded"
                  onClick={() => walletModel.events.walletSelected(wallet.id)}
                >
                  {wallet.isActive ? (
                    <Icon name="checkmark" className="text-icon-accent" size={20} />
                  ) : (
                    <div className="w-5 h-5 row-span-2" />
                  )}
                  <div className="flex flex-col">
                    <BodyText className="text-text-secondary max-w-[260px] truncate">{wallet.name}</BodyText>
                    <WalletFiatBalance walletId={wallet.id} className="text-help-text" />
                  </div>
                </button>
                <IconButton
                  className="absolute right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                  name="info"
                  onClick={() => walletSelectModel.events.walletForDetailsSet(wallet)}
                />
              </div>
            </li>
          ))}
        </ul>
      </Accordion.Content>
    </Accordion>
  );
};
