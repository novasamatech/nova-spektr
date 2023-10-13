import { Accordion, CaptionText, BodyText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { Wallet, WalletFamily, WalletType } from '@renderer/shared/core';
import { WalletIcon, walletModel } from '@renderer/entities/wallet';
import { cnTw } from '@renderer/shared/lib/utils';

export const GroupLabels: Record<WalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
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
      <Accordion.Button buttonClass="px-2 py-1.5 hover:bg-action-background-hover focus:bg-action-background-hover focus:outline-none">
        <div className="flex gap-x-2 items-center">
          <WalletIcon type={type} />
          <CaptionText className="text-text-secondary  font-semibold uppercase">{t(GroupLabels[type])}</CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{wallets.length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content>
        <ul>
          {wallets.map((wallet) => (
            <li
              key={wallet.id}
              className={cnTw(
                'hover:bg-action-background-hover focus:bg-action-background-hover',
                wallet.isActive && 'bg-selected-background',
              )}
            >
              <button
                className="w-full py-1.5 px-4 flex flex-col"
                onClick={() => walletModel.events.walletSelected(wallet.id)}
              >
                <BodyText className="text-text-secondary max-w-[260px] truncate">{wallet.name}</BodyText>
              </button>
            </li>
          ))}
        </ul>
      </Accordion.Content>
    </Accordion>
  );
};
