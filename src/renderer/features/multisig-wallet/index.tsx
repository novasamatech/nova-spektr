import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { type Transaction, TransactionType, WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { assert, nullable, toAddress } from '@/shared/lib/utils';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { accountService, balanceService, multisigOperationService, transactionService } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { getExtrinsic } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { transactionSDK } from '@/sdk/transaction';
// TODO cringe remove it please
import { type ProxyTransaction } from '@/features/proxied-wallet';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';
import { multisigService } from './services/multisig';
import { type MultisigTransaction } from './types';

export { walletActionsSlot, WalletGroup };

export const multisigWalletFeature = createFeature({
  name: 'wallet/multisig',
  enable: $features.map(f => f.multisig || f.flexibleMultisig),
});

accountSDK(multisigWalletFeature, {
  actionPermission() {
    return false;
  },
  availableOnChain({ account, chain }) {
    if (accountUtils.isMultisigAccount(account) || accountUtils.isMultisigSignatoryAccount(account)) {
      return networkUtils.isMultisigSupported(chain.options);
    }

    if (accountUtils.isFlexibleMultisigAccount(account)) {
      return (
        accountService.isChainMatch(account, chain) &&
        networkUtils.isMultisigSupported(chain.options) &&
        networkUtils.isPureProxySupported(chain.options)
      );
    }
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children, { account, accounts }) {
    if (accountUtils.isMultisigAccount(account) || accountUtils.isFlexibleMultisigAccount(account)) {
      return account.signatories
        .map(signatory => {
          const signatoryAccount = accounts.find(a => a.accountId === signatory.accountId);

          return (
            signatoryAccount ??
            multisigService.createSignatoryVirtualAccount(signatory, account.accountId, account.walletId)
          );
        })
        .concat(children);
    }

    return children;
  },
  visualGraphNode({ account, t }) {
    if (accountUtils.isMultisigAccount(account)) {
      return {
        title: 'Multisig',
        subTitle: t('accountsStructure.multisigThreshold', {
          threshold: account.threshold,
          total: account.signatories.length,
        }),
        color: '#05B199',
        background: 'linear-gradient(180deg, #00AF9A 55.03%, #1AB775 100.43%)',
      };
    }

    if (accountUtils.isFlexibleMultisigAccount(account)) {
      return {
        title: 'Flexible multisig',
        color: '#E85649',
        background: 'linear-gradient(180deg, #E85649 53.45%, #8707D5 80.32%)',
      };
    }

    if (accountUtils.isMultisigSignatoryAccount(account)) {
      return {
        title: 'Signatory',
        color: '#C3C3CB',
        disabled: true,
      };
    }
  },
  connection({ target }) {
    if (accountUtils.isMultisigAccount(target)) {
      return {
        color: '#05B199',
      };
    }

    if (accountUtils.isFlexibleMultisigAccount(target)) {
      return {
        color: '#E85649',
      };
    }
  },
  validateRouteBalances({ account, api, route, asset, chainId, getBalance }) {
    if (accountUtils.isMultisigAccount(account) || accountUtils.isFlexibleMultisigAccount(account)) {
      const deposit = multisigService.getMultisigDeposit(account.threshold, api);
      const payer = accountService.findNextAccount(route, account);

      if (nullable(payer)) {
        return null;
      }

      const balance = getBalance(payer.accountId, chainId, asset.assetId);
      if (nullable(balance)) {
        throw new Error(`Balance for account ${payer.accountId} not found`);
      }

      return {
        account: payer,
        action: 'multisig deposit',
        required: deposit,
        // multisig pallet calculates balance using legacy logic, to transferableMode flag should be overrided
        balance: balanceService.tryReserve(balance, deposit, 'legacy'),
        asset,
      };
    }
  },
});

transactionSDK(multisigWalletFeature, {
  encode(transaction, { api }) {
    if (multisigService.isMultisigTransaction(transaction)) {
      const { threshold, otherSignatories, maybeTimepoint, call, maxWeight } = transaction.args;
      const extrinsic = api.tx.multisig.asMulti(threshold, otherSignatories, maybeTimepoint, call, maxWeight);
      return extrinsic.method.toHex();
    }
  },
  decode(extrinsic) {
    if (extrinsic.method.section === 'multisig' && extrinsic.method.method === 'asMulti') {
      const transaction: MultisigTransaction = {
        type: 'decoded',
        section: 'multisig',
        method: 'asMulti',
        args: {
          threshold: parseInt(extrinsic.args[0].toString()),
          // @ts-expect-error TODO use zod schema
          otherSignatories: extrinsic.args[1].toHuman(),
          timepoint: extrinsic.args[2].toString(),
          call: extrinsic.args[3].toHex(),
          // @ts-expect-error TODO use zod schema
          maxWeight: extrinsic.args[4].toHuman(),
        },
      };

      return transaction;
    }
  },
  wrap(transaction, { api, account, route }) {
    if (accountUtils.isMultisigAccount(account) || accountUtils.isFlexibleMultisigAccount(account)) {
      const signatory = accountService.findNextAccount(route, account);
      assert(signatory, 'Signatory not found');

      const otherSignatories = multisigOperationService.getOtherSignatories(account, signatory.accountId);
      const encodedTransaction = transactionService.encodeTransaction(transaction, api);
      const extrinsic = transactionService.createExtrinsic(transaction, api);

      return transactionService.getExtrinsicWeight(extrinsic).then(maxWeight => {
        if (accountUtils.isFlexibleMultisigAccount(account)) {
          const encodedTransaction = transactionService.encodeTransaction(transaction, api);

          const proxyTransaction: ProxyTransaction = {
            type: 'decoded',
            section: 'proxy',
            method: 'proxy',
            args: {
              real: account.accountId,
              forceProxyType: 'Any',
              call: encodedTransaction.callData,
            },
          };

          const proxyExtrinsic = transactionService.encodeTransaction(proxyTransaction, api);

          return {
            type: 'decoded',
            section: 'multisig',
            method: 'asMulti',
            args: {
              threshold: account.threshold,
              otherSignatories,
              maybeTimepoint: null,
              call: proxyExtrinsic.callData,
              maxWeight,
            },
          } satisfies MultisigTransaction;
        }

        return {
          type: 'decoded',
          section: 'multisig',
          method: 'asMulti',
          args: {
            threshold: account.threshold,
            otherSignatories,
            maybeTimepoint: null,
            call: encodedTransaction.callData,
            maxWeight,
          },
        } satisfies MultisigTransaction;
      });
    }
  },
  unwrap(transaction) {
    if (multisigService.isMultisigTransaction(transaction)) {
      return {
        type: 'encoded',
        callData: transaction.args.call,
      };
    }
  },
  wrapLegacy(transaction, { api, account, route }) {
    if (accountUtils.isMultisigAccount(account) || accountUtils.isFlexibleMultisigAccount(account)) {
      const signatory = accountService.findNextAccount(route, account);
      assert(signatory, 'Signatory not found');

      const otherSignatories = multisigOperationService.getOtherSignatories(account, signatory.accountId);
      const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

      return transactionService.getExtrinsicWeight(extrinsic).then(maxWeight => {
        if (accountUtils.isFlexibleMultisigAccount(account)) {
          const originalExtrinsic = getExtrinsic[transaction.type](transaction.args, api);

          const proxyTransaction: Transaction = {
            type: TransactionType.PROXY,
            accountId: account.accountId,
            chainId: api.genesisHash.toHex(),
            args: {
              real: account.accountId,
              forceProxyType: 'Any',
              call: originalExtrinsic.method.toHex(),
            },
          };

          const proxyExtrinsic = getExtrinsic[proxyTransaction.type](proxyTransaction.args, api);

          return {
            type: TransactionType.MULTISIG_AS_MULTI,
            accountId: account.accountId,
            chainId: api.genesisHash.toHex(),
            args: {
              threshold: account.threshold,
              otherSignatories,
              maybeTimepoint: null,
              call: proxyExtrinsic.method.toHex(),
              callHash: proxyExtrinsic.method.hash.toHex(),
              maxWeight,
            },
          } satisfies Transaction;
        }

        return {
          type: TransactionType.MULTISIG_AS_MULTI,
          accountId: account.accountId,
          chainId: api.genesisHash.toHex(),
          args: {
            threshold: account.threshold,
            otherSignatories,
            maybeTimepoint: null,
            call: extrinsic.method.toHex(),
            callHash: extrinsic.method.hash.toHex(),
            maxWeight,
          },
        } satisfies Transaction;
      });
    }
  },
});

multisigWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (walletUtils.isMultisig(wallet)) {
    const accountId = wallet.accounts.at(0)?.accountId;
    if (accountId) {
      return <WalletAccountIcon address={toAddress(accountId)} type={wallet.type} size={size} />;
    }
  }

  return null;
});

multisigWalletFeature.inject(walletGroupSlot, {
  order: 3,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const multisigs = useUnit(walletsModel.$multisigs);

    return (
      <WalletGroup
        title={t('wallets.multisigLabel')}
        walletType={WalletType.MULTISIG}
        wallets={multisigs}
        query={query}
        onSelect={onSelect}
      />
    );
  },
});
