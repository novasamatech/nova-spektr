import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { type Transaction, TransactionType, WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { assert, nonNullable, toAddress } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { accountService, transactionService } from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { transactionSDK } from '@/sdk/transaction';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletActionsSlot } from './components/WalletRow';
import { walletsModel } from './model/wallets';
import { proxiedService, proxiedWalletService } from './service';
import { type ProxyTransaction } from './types';

export { proxiedWalletService };

export { walletActionsSlot, type ProxyTransaction, walletsModel };

export const proxiedWalletFeature = createFeature({
  name: 'wallet/proxied',
  enable: $features.map(f => f.proxy),
});

accountSDK(proxiedWalletFeature, {
  actionPermission() {
    return false;
  },
  availableOnChain({ account, chain }) {
    return accountUtils.isProxiedAccount(account) && accountService.isChainMatch(account, chain);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children, { account, accounts }) {
    if (accountUtils.isProxiedAccount(account)) {
      return account.connections
        .map(connection => accounts.find(a => connection.proxyAccountId === a.accountId))
        .filter(nonNullable)
        .concat(children);
    }
    return children;
  },
  visualGraphNode({ account }) {
    if (accountUtils.isProxiedAccount(account)) {
      return {
        title: 'Proxied',
        color: '#2A1FD5',
        background: 'linear-gradient(180deg, #2A0FD2 57.52%, #8A00CC 85.97%)',
      };
    }
  },
  connection({ source, target, t }) {
    if (accountUtils.isProxiedAccount(target)) {
      return {
        labels: target.connections
          .filter(connection => connection.proxyAccountId === source.accountId)
          .map(connection => {
            return {
              text: t([`proxy.types.${connection.proxyType}`, connection.proxyType]),
              color: 'var(--icons-icon-alert, #7B29FF)',
              background: '#F5EEFF',
            };
          }),
        color: '#2A1FD5',
      };
    }
  },
  validateCallPermission({ route, transaction, api }) {
    return proxiedService.checkPermission(api, route, transaction);
  },
});

transactionSDK(proxiedWalletFeature, {
  encode(transaction, { api }) {
    if (proxiedService.isProxyTransaction(transaction)) {
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
    if (proxiedService.isProxyExtrinsic(extrinsic)) {
      const transaction: ProxyTransaction = {
        type: 'decoded',
        section: 'proxy',
        method: 'proxy',
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
  wrap(transition, { api, account, route }) {
    if (accountUtils.isProxiedAccount(account) || accountUtils.isPureProxiedAccount(account)) {
      const encodedTransaction = transactionService.encodeTransaction(transition, api);
      const proxyAccount = accountService.findNextAccount(route, account);
      assert(proxyAccount, `Proxy for ${account.accountId} is not found`);

      const proxyConnection = proxiedService.findProxyConnection(account, proxyAccount);
      assert(proxyConnection, `Proxy connection for ${proxyAccount.accountId} is not found`);

      const proxyTransaction: ProxyTransaction = {
        type: 'decoded',
        section: 'proxy',
        method: 'proxy',
        args: {
          real: account.accountId,
          forceProxyType: proxyConnection.proxyType,
          call: encodedTransaction.callData,
        },
      };

      return proxyTransaction;
    }
  },
  unwrap(transaction) {
    if (proxiedService.isProxyTransaction(transaction)) {
      return {
        type: 'encoded',
        callData: transaction.args.call,
      };
    }
  },
  wrapLegacy(transaction, { api, account, route }) {
    if (accountUtils.isProxiedAccount(account) || accountUtils.isPureProxiedAccount(account)) {
      const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

      const proxyAccount = accountService.findNextAccount(route, account);
      assert(proxyAccount, `Proxy for ${account.accountId} is not found`);

      const proxyConnection = proxiedService.findProxyConnection(account, proxyAccount);
      assert(proxyConnection, `Proxy connection for ${proxyAccount.accountId} is not found`);

      const proxyTransaction: Transaction = {
        type: TransactionType.PROXY,
        accountId: account.accountId,
        chainId: api.genesisHash.toHex(),
        args: {
          real: account.accountId,
          forceProxyType: proxyConnection.proxyType,
          call: extrinsic.method.toHex(),
        },
      };

      return proxyTransaction;
    }
  },
});

proxiedWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (walletUtils.isProxied(wallet)) {
    const accountId = wallet.accounts[0]?.accountId;

    return <WalletAccountIcon address={toAddress(accountId)} type={wallet.type} size={size} />;
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
