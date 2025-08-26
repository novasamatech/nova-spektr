import { Compact, Enum, GenericCall, GenericMultiAddress } from '@polkadot/types';
import { type Codec } from '@polkadot/types/types';

import { type Chain } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type Extrinsic } from '@/domains/network';

function formatArg(arg: Codec, chain: Chain): unknown {
  if (Array.isArray(arg)) {
    return arg.map((a) => formatArg(a, chain));
  }

  if (arg instanceof GenericCall) {
    const args: Record<string, unknown> = {};

    for (const [key, value] of arg.argsEntries) {
      args[key] = formatArg(value, chain);
    }

    return {
      section: arg.section,
      method: arg.method,
      args,
    };
  }

  if (arg instanceof GenericMultiAddress) {
    if (arg.type === 'Id' || arg.type === 'Address20' || arg.type === 'Address32') {
      return toAddress(arg.value.toString(), { prefix: chain.addressPrefix });
    } else {
      return arg.toHuman();
    }
  }

  const isAccount = pjsSchema.accountId.safeParse(arg);
  if (isAccount.success) {
    return toAddress(isAccount.data, { prefix: chain.addressPrefix });
  }

  if (arg instanceof Compact) {
    return formatArg(arg.unwrap(), chain);
  }

  if (arg instanceof Enum) {
    return {
      [arg.type]: formatArg(arg.value, chain),
    };
  }

  if (arg instanceof Map) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of arg) {
      result[key] = formatArg(value, chain);
    }

    return result;
  }

  return arg.toHuman();
}

function formatExtrinsic(extrinsic: Extrinsic, chain: Chain): object {
  const args: Record<string, unknown> = {};

  // @ts-expect-error argsEntries are not defined in extrinsic type
  for (const [key, value] of extrinsic.method.argsEntries as [string, Codec][]) {
    args[key] = formatArg(value, chain);
  }

  return {
    section: extrinsic.method.section,
    method: extrinsic.method.method,
    args,
  };
}

export const callDataExecuteService = {
  formatExtrinsic,
};
