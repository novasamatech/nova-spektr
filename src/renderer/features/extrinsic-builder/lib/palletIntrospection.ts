import { type ApiPromise } from '@polkadot/api';

import { resolveTypeDef, withBalanceHint } from './typeResolver';
import { type CallArgDef, type CallMeta } from './types';

/**
 * Get all pallet names that have callable extrinsics.
 */
export function getPalletNames(api: ApiPromise): string[] {
  return Object.keys(api.tx)
    .filter((section) => {
      try {
        return Object.keys(api.tx[section]!).length > 0;
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * Get all call/method names within a pallet.
 */
export function getCallNames(api: ApiPromise, pallet: string): string[] {
  const section = api.tx[pallet];
  if (!section) return [];

  return Object.keys(section).sort();
}

/**
 * Get metadata for a specific call: argument definitions and documentation.
 */
export function getCallMeta(api: ApiPromise, pallet: string, method: string): CallMeta | null {
  const section = api.tx[pallet];
  if (!section) return null;

  const callFn = section[method];
  if (!callFn) return null;

  const { meta } = callFn;

  const args: CallArgDef[] = meta.args.map((arg: any) => {
    const name = arg.name.toString();
    const typeStr = arg.type.toString();
    const metaTypeName = arg.typeName?.isSome ? arg.typeName.unwrap().toString() : null;
    // An argument is an amount only when its metadata type name says so (`BalanceOf<T>`, `T::Balance`)
    const typeDef = withBalanceHint(resolveTypeDef(api, typeStr), metaTypeName);

    return { name, typeDef };
  });

  const docs = meta.docs.map((d: any) => d.toString());

  return { args, docs };
}
