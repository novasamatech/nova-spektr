import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletIconType, WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Identicon } from '@/shared/ui';
import { networkUtils } from '@/entities/network';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const multisigWalletFeature = createFeature({
  name: 'wallet/multisig',
  enable: $features.map(f => f.multisig || f.flexibleMultisig),
});

accountSDK(multisigWalletFeature, {
  actionPermission({ account }) {
    return accountUtils.isMultisigAccount(account);
  },
  availableOnChain({ account, chain }) {
    return accountUtils.isMultisigAccount(account) && networkUtils.isMultisigSupported(chain.options);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children, { account, accounts }) {
    if (accountUtils.isMultisigAccount(account)) {
      return account.signatories
        .flatMap(signatory => accounts.filter(a => a.accountId === signatory.accountId))
        .concat(children);
    }
    return children;
  },
  wrapTransaction(transaction) {
    // if (accountUtils.isMultisigAccount(account)) {
    //   const otherSignatories = multisigUtils.getOtherSignatories(account, transaction.accountId, chain.addressPrefix);
    //
    //   return {
    //     chainId: transaction.chainId,
    //     accountId: account.accountId,
    //     type: TransactionType.MULTISIG_AS_MULTI,
    //     args: {
    //       threshold: account.threshold,
    //       otherSignatories,
    //       maybeTimepoint: null,
    //       callData,
    //       callHash,
    //     },
    //   };
    // }
    return transaction;
  },
});

multisigWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isMultisig(wallet)) return null;

  const type =
    walletUtils.isFlexibleMultisig(wallet) && !wallet.activated
      ? WalletIconType.FLEXIBLE_MULTISIG_INACTIVE
      : wallet.type;

  return (
    <div className="relative">
      <Identicon address={wallet.accounts[0].accountId} size={size} background={false} />
      <WalletIcon type={type} size={size / 2} className="absolute -bottom-0.5 -right-0.5" />
    </div>
  );
});

multisigWalletFeature.inject(walletGroupSlot, {
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
