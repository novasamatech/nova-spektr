import { type ApiPromise } from '@polkadot/api';
import { type Codec } from '@polkadot/types/types';
import { createEffect } from 'effector';

import { type Timepoint } from '@/shared/core';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { proxiedWalletService } from '../service';

const $wallets = walletModel.$wallets.map(list => list.filter(walletUtils.isProxied));

type SubscribePureEvent = {
  api: ApiPromise;
  timepoint: Timepoint;
  initiator: AnyAccount;
};

type PureCreatedEvent = {
  pure: AccountId;
  proxyType: Codec;
  disambiguationIndex: number;
  extrinsicIndex: number;
};

const subscribePureEventFx = createEffect(async ({ api, timepoint, initiator }: SubscribePureEvent) => {
  const pureCreated = await new Promise<PureCreatedEvent>(resolve => {
    const unsubscribe = polkadotjsHelpers.subscribeSystemEvents(
      { api, section: `proxy`, methods: ['PureCreated'] },
      event => {
        const who = pjsSchema.helpers.toAccountId(event?.data[1].toHex());

        if (initiator.accountId !== who) return;

        unsubscribe.then(fn => fn());

        resolve({
          pure: pjsSchema.helpers.toAccountId(event.data[0].toHex()),
          proxyType: event.data[2],
          disambiguationIndex: parseInt(event.data[3].toHuman() as string),
          extrinsicIndex: timepoint.index,
        });
      },
    );
  });

  const apiAtBlockHash = await api.rpc.chain.getBlockHash(timepoint.height);

  const apiAt = await api.at(apiAtBlockHash);

  const entropyBlockNumber = await proxiedWalletService.findPureBlockNumber({
    api: apiAt,
    blockNumber: timepoint.height,
    pure: pureCreated.pure,
    spawner: initiator.accountId,
    type: pureCreated.proxyType,
    disambiguationIndex: pureCreated.disambiguationIndex,
    extrinsicIndex: timepoint.index,
  });

  return {
    accountId: pureCreated.pure,
    entropyBlockNumber,
    pendingBlockNumber: timepoint.height,
    extrinsicIndex: pureCreated.extrinsicIndex,
  };
});

export const walletsModel = {
  $wallets,

  subscribePureEventFx,
};
