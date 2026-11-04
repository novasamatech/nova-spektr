import BigNumber from 'bignumber.js';
import { camelCase } from 'lodash';

import { type Asset, type Chain, AssetType } from '@/shared/core';
import { formatAmountStrict, getNativeAsset } from '@/shared/lib/utils';

import { type CallArgDef, type ParameterTypeDef } from './types';

/**
 * Unit an amount argument is entered in. `null` means the unit is not known
 * reliably, so the amount is entered and encoded as a raw base-unit integer.
 */
export type AmountUnit = {
  precision: number;
  symbol: string;
};

/**
 * Pallets whose amount arguments are always denominated in the chain's native
 * token. An allowlist on purpose: an unknown pallet falls back to base units,
 * which is always encoded exactly as typed.
 */
const NATIVE_AMOUNT_PALLETS = new Set([
  'balances',
  'staking',
  'nominationPools',
  'delegatedStaking',
  'convictionVoting',
  'democracy',
  'referenda',
  'treasury',
  'bounties',
  'childBounties',
  'vesting',
  'proxy',
  'multisig',
  'identity',
  'crowdloan',
]);

/** Calls inside native pallets whose amount is denominated in another asset. */
const NON_NATIVE_AMOUNT_CALLS = new Set(['treasury.spend']);

/** Pallets that address a local asset by an `id` argument. */
const ASSET_ID_PALLETS = new Set(['assets', 'poolAssets']);

type ResolveParams = {
  chain: Chain | null;
  pallet: string | null;
  method: string | null;
  /** Argument values in the builder's UI format, keyed by argument name. */
  args: Record<string, unknown>;
};

/**
 * Resolve the unit of every amount argument of a call. Shared by the input, the
 * encoder and the parser so the value shown, encoded and decoded always agree.
 */
export function resolveAmountUnit({ chain, pallet, method, args }: ResolveParams): AmountUnit | null {
  if (!chain || !pallet || !method) return null;

  if (NATIVE_AMOUNT_PALLETS.has(pallet) && !NON_NATIVE_AMOUNT_CALLS.has(`${pallet}.${method}`)) {
    // A chain without assets degrades to base units instead of throwing from a render
    return chain.assets.length > 0 ? toUnit(getNativeAsset(chain.assets)) : null;
  }

  if (ASSET_ID_PALLETS.has(pallet)) {
    const assetId = args['id'];
    if (typeof assetId !== 'string' || !/^\d+$/.test(assetId)) return null;

    const asset = chain.assets.find((a) => isPalletAsset(a, pallet, assetId));

    return asset ? toUnit(asset) : null;
  }

  return null;
}

function isPalletAsset(asset: Asset, pallet: string, assetId: string): boolean {
  if (asset.type !== AssetType.STATEMINE || !asset.typeExtras || !('assetId' in asset.typeExtras)) return false;

  const assetPallet = camelCase(asset.typeExtras.palletName ?? 'assets');

  return assetPallet === pallet && asset.typeExtras.assetId === assetId;
}

// One unit object per asset, so a re-resolve on every keystroke keeps the same reference
const unitCache = new WeakMap<Asset, AmountUnit>();

function toUnit(asset: Asset): AmountUnit {
  let unit = unitCache.get(asset);
  if (!unit) {
    unit = { precision: asset.precision, symbol: asset.symbol };
    unitCache.set(asset, unit);
  }

  return unit;
}

function isSameUnit(a: AmountUnit | null, b: AmountUnit | null): boolean {
  if (!a || !b) return a === b;

  return a.symbol === b.symbol && a.precision === b.precision;
}

/** Whether a value of this type carries an amount anywhere inside it. */
function holdsAmount(def: ParameterTypeDef): boolean {
  switch (def.kind) {
    case 'balance':
      return true;
    case 'compact':
    case 'option':
    case 'vec':
      return def.inner !== undefined && holdsAmount(def.inner);
    case 'struct':
    case 'tuple':
      return def.fields?.some((field) => holdsAmount(field.typeDef)) ?? false;
    case 'enum':
      return def.variants?.some((variant) => variant.fields.some((field) => holdsAmount(field.typeDef))) ?? false;
    default:
      return false;
  }
}

type UnitChangeParams = {
  chain: Chain | null;
  pallet: string | null;
  method: string | null;
  argDefs: CallArgDef[];
};

/**
 * Drop every amount argument from `next` when the change from `prev` moved the
 * call's unit (an `assets` call whose `id` is edited): an amount typed in one
 * unit must not be silently re-read in another. The amounts are cleared rather
 * than rescaled, so nothing is rounded behind the user's back.
 */
export function clearAmountsOnUnitChange(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  { chain, pallet, method, argDefs }: UnitChangeParams,
): Record<string, unknown> {
  const prevUnit = resolveAmountUnit({ chain, pallet, method, args: prev });
  const nextUnit = resolveAmountUnit({ chain, pallet, method, args: next });
  if (isSameUnit(prevUnit, nextUnit)) return next;

  const cleared = { ...next };
  for (const def of argDefs) {
    if (holdsAmount(def.typeDef)) delete cleared[def.name];
  }

  return cleared;
}

/**
 * Convert an entered amount to base units. Throws on input that cannot be
 * represented exactly, so encoding fails instead of silently changing it.
 */
export function toBaseUnits(amount: string, unit: AmountUnit | null): string {
  if (unit) return formatAmountStrict(amount, unit.precision);

  if (!/^\d+$/.test(amount)) {
    throw new Error(`Invalid amount "${amount}": only whole base units are allowed`);
  }

  return new BigNumber(amount).toFixed();
}

/** Convert a base-unit integer to the unit it is entered in. */
export function fromBaseUnits(amount: string, unit: AmountUnit | null): string {
  if (!unit || !/^\d+$/.test(amount)) return amount;

  return new BigNumber(amount).shiftedBy(-unit.precision).toFixed();
}
