import { type ApiPromise } from '@polkadot/api';

import { formatAmount } from '@/shared/lib/utils';

import { type CallArgDef, type ParameterTypeDef } from './types';

/**
 * Encode a call to hex call data. Balance-typed params are converted from
 * human-readable to planck. Returns null if encoding fails.
 */
export function encodeCallData(
  api: ApiPromise,
  pallet: string,
  method: string,
  args: unknown[],
  argDefs?: CallArgDef[],
): string | null {
  try {
    const section = api.tx[pallet];
    if (!section) return null;

    const callFn = section[method];
    if (!callFn) return null;

    const precision = api.registry.chainDecimals[0] ?? 10;
    const convertedArgs = args.map((arg, i) => {
      const def = argDefs?.[i]?.typeDef;

      return convertArgForEncoding(arg, def, precision);
    });

    return callFn(...convertedArgs).method.toHex();
  } catch {
    return null;
  }
}

/**
 * Recursively convert UI-format arg values to Polkadot.js API-compatible
 * format.
 *
 * - Enum { variant, values } → { VariantName: innerValue } or just "VariantName"
 * - Option { enabled, inner } → inner value or null
 * - Balance string → formatAmount planck string
 * - Struct/Tuple objects → recursively convert fields
 * - Vec arrays → recursively convert items
 */
function convertArgForEncoding(arg: unknown, def: ParameterTypeDef | undefined, precision: number): unknown {
  if (arg === undefined || arg === null) return arg;
  if (!def) return arg;

  switch (def.kind) {
    case 'balance': {
      if (typeof arg === 'string' && arg !== '') {
        return formatAmount(arg, precision);
      }

      return arg;
    }

    case 'enum': {
      if (typeof arg === 'object' && arg !== null && 'variant' in arg) {
        const enumVal = arg as { variant: string; values: Record<string, unknown> };
        const variant = def.variants?.find((v) => v.name === enumVal.variant);

        if (!variant || variant.fields.length === 0) {
          return enumVal.variant;
        }

        if (variant.fields.length === 1 && variant.fields[0]) {
          const field = variant.fields[0];
          const innerValue = convertArgForEncoding(enumVal.values[field.name], field.typeDef, precision);

          return { [enumVal.variant]: innerValue };
        }

        const converted: Record<string, unknown> = {};
        for (const field of variant.fields) {
          converted[field.name] = convertArgForEncoding(enumVal.values[field.name], field.typeDef, precision);
        }

        return { [enumVal.variant]: converted };
      }

      return arg;
    }

    case 'option': {
      if (typeof arg === 'object' && arg !== null && 'enabled' in arg) {
        const optVal = arg as { enabled: boolean; inner: unknown };
        if (!optVal.enabled) return null;

        return convertArgForEncoding(optVal.inner, def.inner, precision);
      }

      return arg;
    }

    case 'struct': {
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg) && def.fields) {
        const converted: Record<string, unknown> = {};
        for (const field of def.fields) {
          converted[field.name] = convertArgForEncoding(
            (arg as Record<string, unknown>)[field.name],
            field.typeDef,
            precision,
          );
        }

        return converted;
      }

      return arg;
    }

    case 'tuple': {
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg) && def.fields) {
        return def.fields.map((field) =>
          convertArgForEncoding((arg as Record<string, unknown>)[field.name], field.typeDef, precision),
        );
      }

      return arg;
    }

    case 'vec': {
      if (Array.isArray(arg) && def.inner) {
        return arg.map((item) => convertArgForEncoding(item, def.inner, precision));
      }

      return arg;
    }

    case 'compact': {
      return def.inner ? convertArgForEncoding(arg, def.inner, precision) : arg;
    }

    default:
      // For 'unknown' and other unhandled kinds — try heuristic conversion by value shape
      return convertUnknownArg(arg, precision);
  }
}

/**
 * Heuristic conversion for values where type info is missing (depth limit
 * exceeded). Converts UI-format objects to API-compatible format based on value
 * shape.
 */
function convertUnknownArg(arg: unknown, precision: number): unknown {
  if (arg === undefined || arg === null) return arg;
  if (typeof arg !== 'object') return arg;

  // Enum-like: { variant: "Name", values: {...} }
  if ('variant' in arg && 'values' in arg) {
    const enumVal = arg as { variant: string; values: Record<string, unknown> };
    const convertedValues = Object.entries(enumVal.values).map(([, v]) => convertUnknownArg(v, precision));

    if (convertedValues.length === 0) {
      return enumVal.variant;
    }

    if (convertedValues.length === 1) {
      return { [enumVal.variant]: convertedValues[0] };
    }

    const namedValues: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(enumVal.values)) {
      namedValues[k] = convertUnknownArg(v, precision);
    }

    return { [enumVal.variant]: namedValues };
  }

  // Option-like: { enabled: bool, inner: ... }
  if ('enabled' in arg && 'inner' in arg) {
    const optVal = arg as { enabled: boolean; inner: unknown };

    return optVal.enabled ? convertUnknownArg(optVal.inner, precision) : null;
  }

  // Array → convert each item
  if (Array.isArray(arg)) {
    return arg.map((item) => convertUnknownArg(item, precision));
  }

  // Plain object → convert each value recursively
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(arg as Record<string, unknown>)) {
    result[k] = convertUnknownArg(v, precision);
  }

  return result;
}
