import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletIconType, WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletActionsSlot } from './components/WalletRow';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const walletMultisigFeature = createFeature({
  name: 'wallet/multisig',
  enable: $features.map(f => f.multisig || f.flexibleMultisig),
});

accountSDK(walletMultisigFeature, {
  actionPermission({ account }) {
    return accountUtils.isMultisigAccount(account);
  },
  availableOnChain({ account }) {
    return accountUtils.isMultisigAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectGraphNode(node, { accounts }) {
    const { account } = node;
    if (accountUtils.isMultisigAccount(account)) {
      const signatories = account.signatories
        .map(signatory => accounts.find(a => a.accountId === signatory.accountId))
        .filter(nonNullable);

      return {
        account,
        children: signatories.map(signatory => {
          return accountService.accountGraphCollectPipeline({ account: signatory, children: [] }, { accounts });
        }),
      };
    }

    return node;
  },
});

walletMultisigFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isMultisig(wallet)) return null;

  const type =
    walletUtils.isFlexibleMultisig(wallet) && !wallet.activated
      ? WalletIconType.FLEXIBLE_MULTISIG_INACTIVE
      : wallet.type;

  return <WalletIcon type={type} size={size} />;
});

walletMultisigFeature.inject(walletGroupSlot, {
  order: 3,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const regular = useUnit(walletsModel.$regularMultisig);
    const flexible = useUnit(walletsModel.$flexibleMultisig);

    return (
      <>
        <WalletGroup
          title={t('wallets.multisigLabel')}
          walletType={WalletType.MULTISIG}
          wallets={regular}
          query={query}
          onSelect={onSelect}
        />
        <WalletGroup
          title={t('wallets.flexibleMultisigLabel')}
          walletType={WalletType.FLEXIBLE_MULTISIG}
          wallets={flexible}
          query={query}
          onSelect={onSelect}
        />
      </>
    );
  },
});
