import { BodyText, CaptionText, FootnoteText, Icon, Identicon } from '@renderer/shared/ui';
import { WalletType } from '@renderer/domain/shared-kernel';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { toAddress, SS58_DEFAULT_PREFIX } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { WalletDS } from '@renderer/shared/api/storage';
import { ChainsRecord } from './common/types';
import { Account, getActiveWalletType } from '@renderer/entities/account';

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
        <FootnoteText
          as="span"
          align="center"
          className="border border-token-container-border bg-token-container-background py-1 h-7 w-7"
        >
          {activeAccounts.length > 99 ? '99+' : activeAccounts.length}
        </FootnoteText>
      )}
      {!isMultishard && account && (
        <Identicon address={toAddress(account.accountId, { prefix: addressPrefix })} background={false} size={32} />
      )}

      <div className="flex flex-col gap-y-1 overflow-hidden">
        <BodyText className="truncate">{(account || multishardWallet)?.name}</BodyText>
        <div className="flex items-center gap-x-1">
          <Icon name={GroupIcons[walletType]} className="text-chip-icon" size={16} />
          <CaptionText className="text-chip-text uppercase">{t(GroupLabels[walletType])}</CaptionText>
        </div>
      </div>

      <Icon name="chevron-down" size={16} className="ml-auto shrink-0" />
    </div>
  );
};

export default ActiveAccountCard;
