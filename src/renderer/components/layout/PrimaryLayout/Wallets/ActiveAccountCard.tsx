import { BodyText, CaptionText, HeadlineText } from '@renderer/components/ui-redesign';
import { Icon, Identicon } from '@renderer/components/ui';
import { WalletType } from '@renderer/domain/shared-kernel';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { toAddress } from '@renderer/shared/utils/address';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';
import { useI18n } from '@renderer/context/I18nContext';
import { WalletDS } from '@renderer/services/storage';
import { ChainsRecord } from './common/types';
import { Account, getActiveWalletType } from '@renderer/domain/account';

type Props = {
  activeAccounts: Account[];
  chains: ChainsRecord;
  wallets: WalletDS[];
};

const ActiveAccountCard = ({ activeAccounts, chains, wallets }: Props) => {
  const { t } = useI18n();

  const walletType = getActiveWalletType(activeAccounts);
  if (!walletType) return null;

  const isMultishard = walletType === WalletType.MULTISHARD_PARITY_SIGNER;
  const multishardWallet = isMultishard ? wallets.find((w) => w.id === activeAccounts[0].walletId) : null;

  const account = isMultishard ? null : activeAccounts[0];
  const addressPrefix = account?.chainId ? chains[account.chainId]?.addressPrefix : SS58_DEFAULT_PREFIX;

  return (
    <div className="flex items-center px-3 py-2 gap-x-2 flex-1">
      {isMultishard && multishardWallet && (
        <HeadlineText
          as="span"
          align="center"
          className="border border-token-container-border bg-token-container-background p-[3px] h-7 w-7"
        >
          {activeAccounts.length}
        </HeadlineText>
      )}
      {!isMultishard && account && (
        <Identicon address={toAddress(account.accountId, { prefix: addressPrefix })} background={false} size={28} />
      )}

      <div className="flex flex-col gap-y-1 overflow-hidden">
        <BodyText className="truncate">{(account || multishardWallet)?.name}</BodyText>
        <div className="flex items-center gap-x-1.5">
          <Icon name={GroupIcons[walletType]} className="text-chip-icon" size={14} />
          <CaptionText className="text-chip-text">{t(GroupLabels[walletType])}</CaptionText>
        </div>
      </div>

      <Icon name="down" size={16} className="text-icon-default ml-auto shrink-0" />
    </div>
  );
};

export default ActiveAccountCard;
