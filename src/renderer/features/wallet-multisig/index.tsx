import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { accountsService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { walletGroupSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const walletMultisigFeature = createFeature({
  name: 'wallet/multisig',
  enable: $features.map(f => f.multisig || f.flexibleMultisig),
});

// All multisig accounts can perform actions
walletMultisigFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  return accountUtils.isMultisigAccount(account);
});

walletMultisigFeature.inject(walletGroupSlot, {
  order: 1,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const regular = useUnit(walletsModel.$regularMultisig);
    const flexible = useUnit(walletsModel.$flexibleMutisig);

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
