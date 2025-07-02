import { useUnit } from 'effector-react';

import { balanceService } from '@/shared/api/balances';
import { $features } from '@/shared/config/features';
import {
  AccountType,
  type MultisigSignatoryAccount,
  type Transaction,
  TransactionType,
  WalletIconType,
  WalletType,
} from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { assert, isEthereumAccountId, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { type IconTheme, WalletAccountIcon } from '@/shared/ui-entities';
import { multisigOperationService, transactionService } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { networkUtils } from '@/entities/network';
import { getExtrinsic } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { transactionSDK } from '@/sdk/transaction';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';
import { multisigService } from './services/multisig';
import { type MultisigTransaction } from './types';

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
    return (
      (accountUtils.isMultisigAccount(account) || accountUtils.isMultisigSignatoryAccount(account)) &&
      networkUtils.isMultisigSupported(chain.options)
    );
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children, { account, accounts }) {
    if (accountUtils.isMultisigAccount(account)) {
      return account.signatories
        .map((signatory, index) => {
          const userAccount = accounts.find(a => a.accountId === signatory.accountId);

          if (userAccount) {
            return userAccount;
          } else {
            const accountId = signatory.accountId as string;
            const signatoryAccount: MultisigSignatoryAccount = {
              accountType: AccountType.MULTISIG_SIGNATORY,
              accountId: signatory.accountId,
              id: signatory.id ? `${signatory.id}` : `${index} ${accountId}`,
              name: signatory.name ?? '',
              walletId: account.walletId,
              cryptoType: account.cryptoType,
              type: 'universal',
              signingType: account.signingType,
            };

            return signatoryAccount;
          }
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
  },
  // VALENTIN REVIEW: validation seems to be context-free, in a sense that multiple validations that validate a single account
  // do not work together. Is "reduce balance" approach is in some other branch?
  validateRouteBalances({ account, api, route, balances, chainId, asset, index }) {
    if (accountUtils.isMultisigAccount(account)) {
      const deposit = multisigService.getMultisigDeposit(account.threshold, api);
      const payer = route.at(index + 1);

      if (nullable(payer)) {
        return { account, message: 'Multisig signatory payer not found' };
      }
      const balance = balanceUtils.getBalance(balances, payer.accountId, chainId, asset.assetId.toString());
      if (nullable(balance)) {
        return { account, message: 'Balance not found' };
      }

      return balanceService.getExistentialDeposit(api, asset).then(existentialDeposit => {
        const spend = existentialDeposit.add(deposit);
        if (withdrawableAmountBN(balance).lt(spend)) {
          return { account, message: 'Insufficient funds for multisig deposit' };
        }
        return null;
      });
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
  wrap(transaction, { api, account, route, index }) {
    if (accountUtils.isMultisigAccount(account)) {
      const signatory = route.at(index + 1);
      assert(signatory, 'Signatory not found');

      const otherSignatories = multisigOperationService.getOtherSignatories(account, signatory.accountId);
      const encodedTransaction = transactionService.encodeTransaction(transaction, api);
      const extrinsic = transactionService.createSubmittableExtrinsic(transaction, api);

      return transactionService.getExtrinsicWeight(extrinsic).then(maxWeight => {
        const multisigTransaction: MultisigTransaction = {
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
        };

        return multisigTransaction;
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
  wrapLegacy(transaction, { api, account, route, index }) {
    if (accountUtils.isMultisigAccount(account)) {
      const signatory = route.at(index + 1);
      assert(signatory, 'Signatory not found');

      const otherSignatories = multisigOperationService.getOtherSignatories(account, signatory.accountId);
      const extrinsic = getExtrinsic[transaction.type](transaction.args, api);

      return transactionService.getExtrinsicWeight(extrinsic).then(maxWeight => {
        const multisigTransaction: Transaction = {
          type: TransactionType.MULTISIG_AS_MULTI,
          accountId: account.accountId,
          chainId: api.genesisHash.toHex(),
          args: {
            threshold: account.threshold,
            otherSignatories,
            maybeTimepoint: null,
            callData: extrinsic.method.toHex(),
            maxWeight,
          },
        };

        return multisigTransaction;
      });
    }
  },
});

multisigWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isMultisig(wallet)) return null;

  const type =
    walletUtils.isFlexibleMultisig(wallet) && !wallet.activated
      ? WalletIconType.FLEXIBLE_MULTISIG_INACTIVE
      : wallet.type;

  const address = wallet.accounts[0]?.accountId;
  const isEthereum = isEthereumAccountId(address);
  const theme: IconTheme = isEthereum ? 'ethereum' : 'polkadot';

  return <WalletAccountIcon address={address} type={type} size={size} theme={theme} />;
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
