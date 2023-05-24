import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';

import { ActiveAccount, RootAccount } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { BodyText, CaptionText, HeadlineText } from '@renderer/components/ui-redesign';
import { Icon, Identicon } from '@renderer/components/ui';
import { isMultisig, isRootAccount } from '@renderer/domain/account';
import { ChainId, SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { toAddress } from '@renderer/shared/utils/address';
import { Chain } from '@renderer/domain/chain';
import { useChains } from '@renderer/services/network/chainsService';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';
import { useI18n } from '@renderer/context/I18nContext';

// TODO move somewhere to shared
const getWalletType = (account: ActiveAccount): WalletType => {
  if (isMultisig(account)) {
    return WalletType.MULTISIG;
  }

  if (isRootAccount(account)) {
    return WalletType.MULTISHARD_PARITY_SIGNER;
  }

  if (account.signingType === SigningType.WATCH_ONLY) {
    return WalletType.WATCH_ONLY;
  }

  if (account.signingType === SigningType.PARITY_SIGNER) {
    return WalletType.SINGLE_PARITY_SIGNER;
  }

  return WalletType.SINGLE_PARITY_SIGNER;
};

type Props = {
  account: ActiveAccount;
};

const ActiveAccountCard = ({ account }: Props) => {
  if (!account) return null;

  const { getChainsData } = useChains();
  const { t } = useI18n();
  const [chainsObject, setChainsObject] = useState<Record<ChainId, Chain>>({});

  useEffect(() => {
    getChainsData().then((chains) => setChainsObject(keyBy(chains, 'chainId')));
  }, []);

  const addressPrefix = account?.chainId ? chainsObject[account.chainId].addressPrefix : SS58_DEFAULT_PREFIX;
  const walletType = getWalletType(account);

  return (
    <div className="flex items-center px-3 py-2 gap-x-2 flex-1">
      {walletType === WalletType.MULTISHARD_PARITY_SIGNER ? (
        <HeadlineText className="border border-token-container-border bg-token-container-background p-[3px] h-7 w-7">
          {(account as RootAccount).amount}
        </HeadlineText>
      ) : (
        <Identicon address={toAddress(account.accountId, { prefix: addressPrefix })} background={false} size={28} />
      )}

      {/* icon or shard numbrer */}
      <div className="flex flex-col gap-y-1">
        <BodyText>{account.name}</BodyText>
        <div className="flex items-center gap-x-1.5">
          <Icon name={GroupIcons[walletType]} className="text-chip-icon" size={14} />
          <CaptionText className="text-chip-text">{t(GroupLabels[walletType])}</CaptionText>
        </div>
      </div>

      <Icon name="down" size={16} className="text-icon-default ml-auto" />
    </div>
  );
};

export default ActiveAccountCard;
