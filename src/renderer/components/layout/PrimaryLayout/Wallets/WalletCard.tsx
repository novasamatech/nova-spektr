import { useUnit } from 'effector-react';

import { BodyText, CaptionText, FootnoteText, Icon, Identicon } from '@renderer/shared/ui';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { toAddress, SS58_DEFAULT_PREFIX } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { ChainsRecord } from './common/types';
import { walletModel, accountModel, walletUtils, accountUtils } from '@renderer/entities/wallet';
import { Account } from '@renderer/shared/core';

function getChainAddressPrefix(chains: ChainsRecord, account: Account): number {
  if (!accountUtils.isChainAccount(account)) return SS58_DEFAULT_PREFIX;

  return chains[account.chainId]?.addressPrefix || SS58_DEFAULT_PREFIX;
}

type Props = {
  chains: ChainsRecord;
};

export const WalletCard = ({ chains }: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(accountModel.$activeAccounts);

  if (!activeWallet) return null;

  return (
    <div className="flex items-center px-3 py-2 gap-x-2 flex-1">
      {walletUtils.isMultiShard(activeWallet) ? (
        <FootnoteText
          as="span"
          align="center"
          className="border border-token-container-border bg-token-container-background py-1 h-7 w-7"
        >
          {activeAccounts.length > 99 ? '99+' : activeAccounts.length}
        </FootnoteText>
      ) : (
        <Identicon
          address={toAddress(activeAccounts[0].accountId, { prefix: getChainAddressPrefix(chains, activeAccounts[0]) })}
          background={false}
          size={28}
        />
      )}
      <div className="flex flex-col gap-y-1 overflow-hidden">
        {walletUtils.isMultiShard(activeWallet) ? (
          <BodyText className="truncate">{activeWallet.name}</BodyText>
        ) : (
          <BodyText className="truncate">{activeAccounts[0].name}</BodyText>
        )}
        <div className="flex items-center gap-x-1">
          <Icon name={GroupIcons[activeWallet.type]} className="text-chip-icon" size={14} />
          <CaptionText className="text-chip-text uppercase">{t(GroupLabels[activeWallet.type])}</CaptionText>
        </div>
      </div>

      <Icon name="down" size={16} className="ml-auto shrink-0" />
    </div>
  );
};
