import { combine, createEffect, createEvent, sample } from 'effector';
import { interval } from 'patronum';
import { GraphQLClient } from 'graphql-request';

import {
  Chain,
  MultisigAccount,
  NotificationType,
  AccountType,
  ChainType,
  CryptoType,
  ExternalType,
  SigningType,
  WalletType,
  Wallet,
} from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { MultisigResult, multisigService } from '@entities/multisig';
import { isEthereumAccountId, toAddress } from '@shared/lib/utils';
import { CreateParams } from '@entities/wallet/model/wallet-model';
import { notificationModel } from '@entities/notification';
import { multisigUtils } from '../lib/mulitisigs-utils';

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const multisigsDiscoveryStarted = createEvent();
const multisigSaved = createEvent<GetMultisigsResult>();

const $chainsSupportingMultisigDiscovery = combine(networkModel.$chains, (chains) =>
  Object.values(chains).filter(
    (chain) => multisigUtils.isMultisigSupported(chain) && chain.externalApi?.[ExternalType.MULTISIG]?.[0]?.url,
  ),
);

$chainsSupportingMultisigDiscovery.watch((c) => console.log('---> C :', c));

type GetMultisigsParams = {
  chains: Chain[];
  wallets: Wallet[];
};

type GetMultisigsResult = {
  chain: Chain;
  indexedMultisigs: MultisigResult[];
};

const getMultisigsFx = createEffect(({ chains, wallets }: GetMultisigsParams): void => {
  chains.forEach((chain) => {
    const accounts = walletUtils.getAccountsBy(wallets, (a) => accountUtils.isChainIdMatch(a, chain.chainId));
    const multisigIndexerUrl = chain.externalApi?.[ExternalType.MULTISIG]?.[0]?.url;
    if (multisigIndexerUrl && accounts.length) {
      const client = new GraphQLClient(multisigIndexerUrl);

      multisigService
        .filterMultisigsAccounts(
          client,
          accounts.map((account) => account.accountId),
        )
        .then((indexedMultisigs) => {
          const multisigsToSave = indexedMultisigs.filter((multisigrResult) => {
            // we filter out the multisigs that we already have
            const sameWallet = walletUtils.getWalletFilteredAccounts(wallets, {
              accountFn: (account) => {
                return account.accountId === multisigrResult.accountId;
              },
            });

            const walletAllreadyExist = Boolean(sameWallet);

            return !walletAllreadyExist;
          });

          multisigsToSave.length > 0 && multisigSaved({ indexedMultisigs: multisigsToSave, chain });
        });
    }
  });
});

const saveMultisigFx = createEffect((multisigsToAdd: CreateParams<MultisigAccount>[]) => {
  multisigsToAdd.forEach((multisig) => {
    walletModel.events.multisigCreated(multisig);

    notificationModel.events.notificationsAdded([
      {
        read: false,
        type: NotificationType.MULTISIG_CREATED,
        dateCreated: Date.now(),
      },
    ]);
  });
});

const { tick: multisigDiscoveryTriggered } = interval({
  start: multisigsDiscoveryStarted,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

sample({
  clock: [multisigDiscoveryTriggered, $chainsSupportingMultisigDiscovery],
  source: {
    connections: networkModel.$connections,
    chains: $chainsSupportingMultisigDiscovery,
    wallets: walletModel.$wallets,
  },
  fn: ({ chains, connections, wallets }) => {
    return {
      chains: chains.filter((chain) => !networkUtils.isDisabledConnection(connections[chain.chainId])),
      wallets,
    };
  },
  target: getMultisigsFx,
});

sample({
  clock: multisigSaved,
  fn: ({ indexedMultisigs, chain }) => {
    const walletsToSave = indexedMultisigs.map(
      ({ threshold, accountId, signatories }) =>
        ({
          wallet: {
            name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
            type: WalletType.MULTISIG,
            signingType: SigningType.MULTISIG,
          },
          accounts: [
            {
              threshold: threshold,
              accountId: accountId,
              signatories: signatories.map((signatory) => ({
                accountId: signatory,
                address: toAddress(signatory),
              })),
              name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
              chainId: chain.chainId,
              cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
              chainType: ChainType.SUBSTRATE,
              type: AccountType.MULTISIG,
            },
          ],
        } as CreateParams<MultisigAccount>),
    );

    return walletsToSave;
  },
  target: saveMultisigFx,
});

export const multisigsModel = {
  events: {
    multisigsDiscoveryStarted,
  },
};
