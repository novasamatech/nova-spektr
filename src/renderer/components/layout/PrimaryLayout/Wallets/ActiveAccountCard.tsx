import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';

import { BodyText, CaptionText, HeadlineText } from '@renderer/components/ui-redesign';
import { Icon, Identicon } from '@renderer/components/ui';
import { isMultisig } from '@renderer/domain/account';
import { ChainId, SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { toAddress } from '@renderer/shared/utils/address';
import { Chain } from '@renderer/domain/chain';
import { useChains } from '@renderer/services/network/chainsService';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS } from '@renderer/services/storage';
import { useWalletsStructure } from '@renderer/components/layout/PrimaryLayout/Wallets/common/useWalletStructure';

// TODO move somewhere to shared
const getWalletType = (accounts: AccountDS[]): WalletType => {
  if (accounts.length > 1) {
    return WalletType.MULTISHARD_PARITY_SIGNER;
  }

  const account = accounts[0];
  if (isMultisig(account)) {
    return WalletType.MULTISIG;
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
  accounts: AccountDS[];
};

const ActiveAccountCard = ({ accounts }: Props) => {
  if (!accounts.length) return null;

  const { getChainsData } = useChains();
  const { t } = useI18n();

  const [chainsObject, setChainsObject] = useState<Record<ChainId, Chain>>({});
  const wallets = useWalletsStructure({ signingType: SigningType.PARITY_SIGNER }, '');

  useEffect(() => {
    getChainsData().then((chains) => setChainsObject(keyBy(chains, 'chainId')));
  }, []);

  const walletType = getWalletType(accounts);
  const isMultishard = walletType === WalletType.MULTISHARD_PARITY_SIGNER;

  const account = isMultishard ? null : accounts[0];
  const addressPrefix = account?.chainId ? chainsObject[account.chainId].addressPrefix : SS58_DEFAULT_PREFIX;

  const multishardWallet = isMultishard ? wallets.find((w) => w.id === accounts[0].walletId) : null;

  return (
    <div className="flex items-center px-3 py-2 gap-x-2 flex-1">
      {isMultishard && multishardWallet && (
        <HeadlineText
          as="span"
          align="center"
          className="border border-token-container-border bg-token-container-background p-[3px] h-7 w-7"
        >
          {multishardWallet.amount}
        </HeadlineText>
      )}
      {!isMultishard && account && (
        <Identicon address={toAddress(account.accountId, { prefix: addressPrefix })} background={false} size={28} />
      )}

      <div className="flex flex-col gap-y-1">
        <BodyText>{(account || multishardWallet)?.name}</BodyText>
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
