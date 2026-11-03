import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';

import { type AmountUnit, fromBaseUnits, resolveAmountUnit } from './amountUnit';
import { getCallMeta } from './palletIntrospection';
import { type ParameterTypeDef } from './types';

export type ParsedCallData = {
  pallet: string;
  call: string;
  args: Record<string, unknown>;
};

/**
 * Parse hex call data into pallet, call, and args. Used when switching from
 * Paste to Build tab. Amounts, nested ones included, are shown in the unit
 * `resolveAmountUnit` picks for the call — the same one the encoder uses — so
 * hex → form → hex is stable.
 */
export function parseCallData(api: ApiPromise, callDataHex: string, chain: Chain | null = null): ParsedCallData | null {
  try {
    if (!callDataHex || !callDataHex.startsWith('0x')) return null;

    const extrinsicCall = api.createType('Call', callDataHex);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    const rawArgs: Record<string, unknown> = {};
    for (const [key, value] of extrinsicCall.argsEntries as Iterable<[string, any]>) {
      rawArgs[key] = codecToValue(value);
    }

    // The unit may depend on other args (e.g. the asset id), so resolve it after decoding
    const unit = resolveAmountUnit({ chain, pallet: section, method, args: rawArgs });
    if (!unit) return { pallet: section, call: method, args: rawArgs };

    const argDefs = getCallMeta(api, section, method)?.args ?? [];
    const args: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawArgs)) {
      const def = argDefs.find((argDef) => argDef.name === key)?.typeDef;
      args[key] = def ? convertAmountsForDisplay(value, def, unit) : value;
    }

    return { pallet: section, call: method, args };
  } catch {
    return null;
  }
}

type EnumValue = { variant: string; values: Record<string, unknown> };
type OptionValue = { enabled: boolean; inner: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnumValue(value: unknown): value is EnumValue {
  return isRecord(value) && typeof value['variant'] === 'string' && isRecord(value['values']);
}

function isOptionValue(value: unknown): value is OptionValue {
  return isRecord(value) && typeof value['enabled'] === 'boolean' && 'inner' in value;
}

/**
 * Walk a decoded UI value along its type and convert every balance leaf from
 * base units to `unit` — the mirror of the encoder's conversion.
 */
function convertAmountsForDisplay(value: unknown, def: ParameterTypeDef, unit: AmountUnit): unknown {
  switch (def.kind) {
    case 'balance':
      return typeof value === 'string' ? fromBaseUnits(value, unit) : value;

    case 'compact':
      return def.inner ? convertAmountsForDisplay(value, def.inner, unit) : value;

    case 'option':
      if (!isOptionValue(value) || !value.enabled || !def.inner) return value;

      return { ...value, inner: convertAmountsForDisplay(value.inner, def.inner, unit) };

    case 'vec': {
      const inner = def.inner;
      if (!Array.isArray(value) || !inner) return value;

      return value.map((item) => convertAmountsForDisplay(item, inner, unit));
    }

    case 'struct':
    case 'tuple':
      return convertFields(value, def.fields ?? [], unit);

    case 'enum': {
      if (!isEnumValue(value)) return value;

      const variant = def.variants?.find((v) => v.name === value.variant);
      if (!variant || variant.fields.length === 0) return value;

      const [firstField] = variant.fields;
      // The decoder puts a variant's payload under key "0": a single field directly, several as a struct
      if (variant.fields.length === 1 && firstField && !(firstField.name in value.values) && '0' in value.values) {
        return { ...value, values: { '0': convertAmountsForDisplay(value.values['0'], firstField.typeDef, unit) } };
      }
      if (variant.fields.length > 1 && isRecord(value.values['0'])) {
        return { ...value, values: { '0': convertFields(value.values['0'], variant.fields, unit) } };
      }

      return { ...value, values: convertFields(value.values, variant.fields, unit) };
    }

    default:
      return value;
  }
}

function convertFields(
  value: unknown,
  fields: { name: string; typeDef: ParameterTypeDef }[],
  unit: AmountUnit,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const field = fields[index];

      return field ? convertAmountsForDisplay(item, field.typeDef, unit) : item;
    });
  }
  if (!isRecord(value)) return value;

  const converted: Record<string, unknown> = { ...value };
  for (const field of fields) {
    if (field.name in value) {
      converted[field.name] = convertAmountsForDisplay(value[field.name], field.typeDef, unit);
    }
  }

  return converted;
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

    // Try enum value accessors: .as${Variant} (most reliable), then .inner
    const asAccessor = value[`as${variantName}`];
    const innerValue = asAccessor !== undefined && asAccessor !== null ? asAccessor : value.inner;

    if (innerValue && innerValue !== value) {
      // Array-like (Vec) — must check BEFORE struct, since Vec also has .entries()
      if (
        innerValue.length !== undefined &&
        typeof innerValue.map === 'function' &&
        typeof innerValue.length === 'number'
      ) {
        return { variant: variantName, values: { '0': codecToValue(innerValue) } };
      }

      // Struct with named fields
      if (typeof innerValue.entries === 'function' && typeof innerValue.defKeys !== 'undefined') {
        return { variant: variantName, values: { '0': codecStructToValues(innerValue) } };
      }

      return { variant: variantName, values: { '0': codecToValue(innerValue) } };
    }

    // Fallback: try .value accessor
    if (value.value && typeof value.value === 'object' && value.value !== value) {
      if (value.value.defKeys || (value.value.toJSON && typeof value.value.entries === 'function')) {
        return { variant: variantName, values: { '0': codecStructToValues(value.value) } };
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
  // Guard: reject complex codec types (enums have .type, structs have .defKeys)
  // whose .toNumber() returns a variant index, not an actual byte value
  if (value.toHex && value.length !== undefined && typeof value.map === 'function' && value.length > 0) {
    const first = value[0];
    if (
      typeof first?.toNumber === 'function' &&
      first.toNumber() >= 0 &&
      first.toNumber() <= 255 &&
      !first.type &&
      !first.defKeys
    ) {
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
