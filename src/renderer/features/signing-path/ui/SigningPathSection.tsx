import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset, type Balance, type Chain } from '@/shared/core';
import { getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { balanceModel, balanceUtils } from '@/entities/balance';

import { SigningPathInline } from './SigningPathInline';

/**
 * Shape the section probes for at runtime — anything with an optional
 * `account.accountId` field works. Forms can pass their narrow validation error
 * union directly; non-matching variants are ignored by the runtime check inside
 * `errorAccountIds`.
 */
export type SigningPathTxError = unknown;

type Props = {
  signingPath: PathNode[];
  chain: Chain | null;
  asset: Asset | null;
  /** Validation errors from the form's `$txErrors` / `$errors` store. */
  txErrors: readonly SigningPathTxError[];
  errorText?: string;
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  /**
   * Override the balance value shown per hop. Defaults to `transferableAmount`.
   * Pass e.g. `withdrawableAmount` for proxy-deposit-bearing flows or
   * `balance.free` for governance flows where locked stake is relevant.
   */
  balanceExtractor?: (balance: Balance | null | undefined) => BN | string | null;
  onChange: (path: PathNode[]) => void;
};

const defaultBalanceExtractor: NonNullable<Props['balanceExtractor']> = (b) => (b ? transferableAmount(b) : null);

/**
 * Smart wrapper around `SigningPathInline`. Gates rendering on
 * `signingPath.length >= 2` (direct signing has nothing to visualize) and
 * absorbs the boilerplate previously duplicated across every form that wires up
 * a signing path: error→accountId derivation and per-hop balance lookup.
 */
export const SigningPathSection = ({
  signingPath,
  chain,
  asset,
  txErrors,
  errorText,
  allowedProxyTypes,
  disabledProxyReason,
  balanceExtractor = defaultBalanceExtractor,
  onChange,
}: Props) => {
  const balances = useUnit(balanceModel.$balanceMap);

  const errorAccountIds = useMemo<ReadonlySet<AccountId>>(() => {
    const ids = new Set<AccountId>();
    for (const e of txErrors) {
      if (!e || typeof e !== 'object') continue;
      const account = (e as { account?: { accountId?: AccountId } | null }).account;
      const accountId = account?.accountId;
      if (accountId) ids.add(accountId);
    }
    return ids;
  }, [txErrors]);

  if (signingPath.length < 2 || !chain || !asset) return null;

  // Non-native operation assets (e.g. KSM on Polkadot Asset Hub where DOT is
  // native) settle the amount on the source but pay fees / multisig deposit
  // in the chain's native token. Split the asset shown per hop so the source
  // surfaces the operation balance while the rest of the path surfaces the
  // fee-paying native balance.
  const nativeAsset = getNativeAsset(chain.assets);
  const feeAsset = nativeAsset.assetId === asset.assetId ? undefined : nativeAsset;

  const getBalance = (accountId: AccountId, isFeeHop: boolean) => {
    const targetAsset = isFeeHop && feeAsset ? feeAsset : asset;
    const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, targetAsset.assetId);
    return balanceExtractor(balance);
  };

  return (
    <SigningPathInline
      chainId={chain.chainId}
      path={signingPath}
      asset={asset}
      feeAsset={feeAsset}
      getBalance={getBalance}
      errorAccountIds={errorAccountIds}
      errorText={errorText}
      allowedProxyTypes={allowedProxyTypes}
      disabledProxyReason={disabledProxyReason}
      onChange={onChange}
    />
  );
};
