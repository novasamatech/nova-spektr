import { type ApiPromise } from '@polkadot/api';

import { fromPrecision } from '@/shared/lib/utils';

import { getCallMeta } from './palletIntrospection';

export type ParsedCallData = {
  pallet: string;
  call: string;
  args: Record<string, unknown>;
};

/**
 * Parse hex call data into pallet, call, and args. Used when switching from
 * Paste to Build tab.
 */
export function parseCallData(api: ApiPromise, callDataHex: string): ParsedCallData | null {
  try {
    if (!callDataHex || !callDataHex.startsWith('0x')) return null;

    const extrinsicCall = api.createType('Call', callDataHex);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    // Get arg defs to detect balance params for precision conversion
    const callMeta = getCallMeta(api, section, method);
    const precision = api.registry.chainDecimals[0] ?? 10;

    const args: Record<string, unknown> = {};
    let argIndex = 0;
    for (const [key, value] of extrinsicCall.argsEntries as Iterable<[string, any]>) {
      let converted = codecToValue(value);

      // Convert raw planck to human-readable for balance params
      if (
        callMeta?.args[argIndex]?.typeDef.kind === 'balance' &&
        typeof converted === 'string' &&
        /^\d+$/.test(converted)
      ) {
        converted = fromPrecision(converted, precision);
      }

      args[key] = converted;
      argIndex++;
    }

    return { pallet: section, call: method, args };
  } catch {
    return null;
  }
}

/**
 * Convert a Polkadot.js codec value to a UI-compatible value. Handles: Bytes,
 * Boolean, AccountId, Call, Option, Enum, Vec, Struct.
 */
function codecToValue(value: any): unknown {
  if (value === null || value === undefined) return '';

  // Bytes / Vec<u8> — convert to hex string
  if (value.toHex && (value.constructor?.name === 'Bytes' || value.constructor?.name === 'Raw')) {
    return value.toHex();
  }

  // Boolean
  if (typeof value.isTrue === 'boolean') return value.isTrue;
  if (typeof value.valueOf() === 'boolean') return value.valueOf();

  // AccountId / MultiAddress with Id variant — extract plain address string
  if (value.type === 'Id' && value.inner?.toString) {
    return value.inner.toString();
  }
  // Direct AccountId32
  if (value.constructor?.name === 'AccountId32' || value.constructor?.name === 'GenericAccountId') {
    return value.toString();
  }

  // Call / RuntimeCall — convert to hex for nested builder restoration
  if (value.callIndex && value.toHex && typeof value.section === 'string' && typeof value.method === 'string') {
    return value.toHex();
  }

  // Option — must check before enum since Option is also an enum internally
  if (typeof value.isSome === 'boolean' && typeof value.isNone === 'boolean') {
    return value.isSome ? { enabled: true, inner: codecToValue(value.unwrap()) } : { enabled: false, inner: '' };
  }

  // Enum detection: has `.type` (active variant name) and `is${Type}` boolean property
  if (value.type && typeof value.type === 'string' && `is${value.type}` in value) {
    const variantName = value.type;

    // Enum with inner value (single unnamed field)
    if (value.inner) {
      return { variant: variantName, values: { '0': codecToValue(value.inner) } };
    }

    // Enum with `.value` (alternative accessor for inner data)
    if (value.value && typeof value.value === 'object' && value.value !== value) {
      if (value.value.defKeys || (value.value.toJSON && typeof value.value.entries === 'function')) {
        const fields = codecStructToValues(value.value);

        return { variant: variantName, values: fields };
      }

      return { variant: variantName, values: { '0': codecToValue(value.value) } };
    }

    // Enum variant with no fields (like "Here", "Any")
    return { variant: variantName, values: {} };
  }

  // Number types — convert to string for input fields
  if (value.toBigInt) {
    try {
      return value.toBigInt().toString();
    } catch {
      // fallback
    }
  }

  // Vec<u8> — detect by checking if all elements are small numbers (bytes)
  if (value.toHex && value.length !== undefined && typeof value.map === 'function' && value.length > 0) {
    const first = value[0];
    if (typeof first?.toNumber === 'function' && first.toNumber() >= 0 && first.toNumber() <= 255) {
      return value.toHex();
    }
  }

  // Vec/Array
  if (Array.isArray(value) || (value.length !== undefined && typeof value.map === 'function')) {
    try {
      return Array.from(value).map(codecToValue);
    } catch {
      // fallback
    }
  }

  // Struct-like: iterate codec entries to preserve nested types
  if (typeof value.entries === 'function' && typeof value.defKeys !== 'undefined') {
    return codecStructToValues(value);
  }

  // Fallback struct via toJSON — recursively process nested values
  if (value.toJSON && typeof value.toJSON === 'function') {
    const json = value.toJSON();
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
      return jsonToUiValues(json);
    }
  }

  // Default: toString for hex, addresses, etc.
  return value.toString();
}

function codecStructToValues(struct: any): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  try {
    for (const [key, val] of struct.entries()) {
      result[key] = codecToValue(val);
    }
  } catch {
    const json = struct.toJSON?.();
    if (typeof json === 'object' && json !== null) {
      return jsonToUiValues(json);
    }
  }

  return result;
}

function jsonToUiValues(json: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) {
    result[k] = jsonValueToUi(v);
  }

  return result;
}

function jsonValueToUi(val: unknown): unknown {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return val;

  if (Array.isArray(val)) {
    return val.map(jsonValueToUi);
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);

    // Detect enum-like pattern: single key with PascalCase name → { variant, values }
    if (entries.length === 1) {
      const [key, inner] = entries[0]!;
      if (/^[A-Z]/.test(key)) {
        if (inner === null || inner === undefined) {
          return { variant: key, values: {} };
        }
        if (typeof inner === 'object' && !Array.isArray(inner)) {
          return { variant: key, values: jsonToUiValues(inner as Record<string, unknown>) };
        }

        return { variant: key, values: { '0': jsonValueToUi(inner) } };
      }
    }

    return jsonToUiValues(val as Record<string, unknown>);
  }

  return String(val);
}
