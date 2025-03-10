import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Icon } from '@/shared/ui';
import { transactionService } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { transactionSDK } from '@/sdk/transaction';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletActionsSlot } from './components/WalletRow';
import { walletsModel } from './model/wallets';
import { proxyService } from './services/proxyTransaction';
import { type ProxyTransaction } from './types';

export { walletActionsSlot };

export const proxiedWalletFeature = createFeature({
  name: 'wallet/proxied',
  enable: $features.map(f => f.proxy),
});

accountSDK(proxiedWalletFeature, {
  actionPermission({ account }) {
    return accountUtils.isProxiedAccount(account);
  },
  availableOnChain({ account }) {
    return accountUtils.isProxiedAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children, { account, accounts }) {
    if (accountUtils.isProxiedAccount(account)) {
      return accounts.filter(a => a.accountId === account.proxyAccountId).concat(children);
    }
    return children;
  },
});

transactionSDK(proxiedWalletFeature, {
  encode(transaction, { api }) {
    if (proxyService.isProxyTransaction(transaction)) {
      const { real, forceProxyType, call } = transaction.args;
      const extrinsic = api.tx.proxy.proxy(
        real,
        // @ts-expect-error Unknown type for @polkadot/api-augment package
        forceProxyType,
        call,
      );
      return extrinsic.method.toHex();
    }
  },
  decode(extrinsic) {
    if (extrinsic.method.section === 'proxy' && extrinsic.method.method === 'proxy') {
      const transaction: ProxyTransaction = {
        type: 'decoded',
        section: 'proxy',
        method: 'asMulti',
        args: {
          real: pjsSchema.helpers.toAccountId(extrinsic.args[0].toHex()),
          // @ts-expect-error TODO use zod schemas
          forceProxyType: extrinsic.args[1].toString(),
          call: extrinsic.args[2].toHex(),
        },
      };

      return transaction;
    }
  },
  wrap(transition, { api, account }) {
    if (accountUtils.isProxiedAccount(account) || accountUtils.isPureProxiedAccount(account)) {
      const encodedTransaction = transactionService.encodeTransaction(transition, api);
      const proxyTransaction: ProxyTransaction = {
        type: 'decoded',
        section: 'proxy',
        method: 'proxy',
        args: {
          real: account.accountId,
          forceProxyType: account.proxyType,
          call: encodedTransaction.callData,
        },
      };

      return proxyTransaction;
    }
  },
  unwrap(transaction) {
    if (proxyService.isProxyTransaction(transaction)) {
      return {
        type: 'encoded',
        callData: transaction.args.call,
      };
    }
  },
});

proxiedWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (walletUtils.isProxied(wallet)) {
    return <Icon name="proxiedBackground" size={size} />;
  }
  return null;
});

proxiedWalletFeature.inject(walletGroupSlot, {
  order: 2,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const wallets = useUnit(walletsModel.$wallets);

    return (
      <WalletGroup
        title={t('wallets.proxiedLabel')}
        walletType={WalletType.PROXIED}
        wallets={wallets}
        query={query}
        onSelect={onSelect}
      />
    );
  },
});
