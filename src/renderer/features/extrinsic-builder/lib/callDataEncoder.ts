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
      return arg;
  }
}
