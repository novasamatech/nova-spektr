import { type Store, combine, sample } from 'effector';

import { type Asset, type Balance, type Chain } from '@/shared/core';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { balanceSubModel } from '@/features/assets-balances';

type Opts = {
  /** Draft signing-path store exposed by `createDraftModeBinding`. */
  $draftPath: Store<PathNode[]>;
  /** Chain the flow targets (e.g. the flow's `$networkStore.chain`). */
  $chain: Store<Chain | null>;
  /** Draft-mode flag exposed by `createDraftModeBinding`. */
  $isDraftMode: Store<boolean>;
  /**
   * Optional asset override. Defaults to the chain's native asset (which is
   * what `Available:` rows show in most transaction-builder flows). Pass when
   * the flow targets a non-native asset (e.g. transfer of USDT on Asset Hub).
   */
  $asset?: Store<Asset | null>;
};

/**
 * Fetches and exposes the balance of the draft path's source account
 * (`path[0]`) on the flow's chain. Uses `balanceSubModel.fetchAccountIds` — a
 * one-shot fetch, not a live subscription, so no cleanup is required. The
 * balance lands in `balanceModel.$balanceMap` and the returned store derives
 * from there.
 *
 * Returns `null` outside draft mode, before the path is set, or if the chain is
 * missing.
 */
export const wireDraftSourceBalance = ({ $draftPath, $chain, $isDraftMode, $asset }: Opts): Store<Balance | null> => {
  sample({
    clock: combine({ path: $draftPath, chain: $chain, isDraftMode: $isDraftMode }),
    filter: ({ path, chain, isDraftMode }) => isDraftMode && path.length > 0 && nonNullable(chain),
    fn: ({ path, chain }) => [{ accountId: path[0]!.accountId, chain: chain! }],
    target: balanceSubModel.fetchAccountIds,
  });

  return combine(
    {
      path: $draftPath,
      chain: $chain,
      asset: $asset ?? $chain.map((c) => (c ? getNativeAsset(c.assets) : null)),
      balances: balanceModel.$balanceMap,
      isDraftMode: $isDraftMode,
    },
    ({ path, chain, asset, balances, isDraftMode }) => {
      if (!isDraftMode || !chain || !asset || path.length === 0) return null;
      const sourceAccountId = path[0]?.accountId;
      if (!sourceAccountId) return null;

      return balanceUtils.getBalance(balances, sourceAccountId, chain.chainId, asset.assetId);
    },
  );
};
