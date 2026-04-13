import { type ApiPromise } from '@polkadot/api';
import { TypeDefInfo } from '@polkadot/types';

import { formatAmount, fromPrecision } from '@/shared/lib/utils';

import {
  type CallArgDef,
  type CallMeta,
  type ParameterTypeDef,
  type PrimitiveType,
  MAX_TYPE_RESOLUTION_DEPTH,
} from './types';

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

  const args: CallArgDef[] = meta.args.map((arg) => {
    const name = arg.name.toString();
    const typeStr = arg.type.toString();
    const metaTypeName = arg.typeName?.isSome ? arg.typeName.unwrap().toString() : null;
    let typeDef = resolveTypeDef(api, typeStr);

    // Override to balance if metadata typeName hints at it, or if it's Compact<u128/u64>
    if (typeDef.kind !== 'balance' && isBalanceLikeParam(typeDef, metaTypeName)) {
      typeDef = { ...typeDef, kind: 'balance' };
    }

    return { name, typeDef };
  });

  const docs = meta.docs.map((d) => d.toString());

  return { args, docs };
}

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
      // Check if value.value is a struct with named fields
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

/**
 * Convert a codec Struct to UI values by iterating its entries (preserves
 * nested codec types).
 */
function codecStructToValues(struct: any): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  try {
    for (const [key, val] of struct.entries()) {
      result[key] = codecToValue(val);
    }
  } catch {
    // Fallback to toJSON
    const json = struct.toJSON?.();
    if (typeof json === 'object' && json !== null) {
      return jsonToUiValues(json);
    }
  }

  return result;
}

/**
 * Recursively convert a JSON object (from toJSON) to UI-compatible values.
 * Detects enum-like objects { VariantName: value } and converts them.
 */
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

    // Regular struct
    return jsonToUiValues(val as Record<string, unknown>);
  }

  return String(val);
}

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
          // Simple enum variant with no fields → just the variant name
          return enumVal.variant;
        }

        if (variant.fields.length === 1 && variant.fields[0]) {
          // Single-field variant → { VariantName: convertedValue }
          const field = variant.fields[0];
          const innerValue = convertArgForEncoding(enumVal.values[field.name], field.typeDef, precision);

          return { [enumVal.variant]: innerValue };
        }

        // Multi-field variant → { VariantName: { field1: val1, field2: val2 } }
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

// Cache: registry instance → (type name → lookup ID)
const nameToIdCache = new WeakMap<object, Map<string, number>>();

function findLookupIdByName(api: ApiPromise, typeName: string): number | null {
  const registry = api.registry.lookup;

  let cache = nameToIdCache.get(registry);
  if (!cache) {
    cache = new Map();
    // Build name → ID map from all registered types
    const types = registry.types;
    for (const portableType of types) {
      const id = portableType.id.toNumber();
      const name = registry.getName(id as any);
      if (name) {
        cache.set(name, id);
      }
    }
    nameToIdCache.set(registry, cache);
  }

  return cache.get(typeName) ?? null;
}

const UNSIGNED_INT_TYPES = new Set(['u8', 'u16', 'u32', 'u64', 'u128', 'u256']);
const SIGNED_INT_TYPES = new Set(['i8', 'i16', 'i32', 'i64', 'i128']);

const BALANCE_TYPE_NAMES = new Set(['Balance', 'BalanceOf', 'Amount', 'CurrencyBalanceOf', 'ExtendedBalance']);

const BALANCE_INNER_TYPES = new Set(['u128', 'u64']);

const ACCOUNT_TYPE_NAMES = new Set([
  'AccountId',
  'AccountId20',
  'AccountId32',
  'AccountIdLookupOf',
  'MultiAddress',
  'Address',
  'LookupSource',
]);

const CALL_TYPE_NAMES = new Set(['RuntimeCall', 'Call', '<T as Config>::RuntimeCall']);

/**
 * Resolve a type string (from meta.args) into a structured ParameterTypeDef.
 * Uses the registry's lookup to walk the type tree.
 */
export function resolveTypeDef(api: ApiPromise, typeStr: string, depth: number = 0): ParameterTypeDef {
  if (depth >= MAX_TYPE_RESOLUTION_DEPTH) {
    return { kind: 'unknown', typeName: typeStr };
  }

  // Try numeric lookup ID — use getSiType for reliable Scale Info resolution
  const numericId = Number(typeStr);
  if (!Number.isNaN(numericId) && Number.isInteger(numericId)) {
    try {
      const siType = api.registry.lookup.getSiType(numericId as any);
      const name = api.registry.lookup.getName(numericId as any) ?? getSiTypeName(siType, typeStr);
      const result = mapSiType(api, siType, name, depth);
      if (result.kind !== 'unknown') return result;
    } catch {
      // fall through
    }
  }

  // arg.type.toString() often returns type NAME (e.g. "XcmVersionedLocation"), not a numeric ID.
  // Find the lookup ID by name and resolve via getSiType.
  const lookupId = findLookupIdByName(api, typeStr);
  if (lookupId !== null) {
    try {
      const siType = api.registry.lookup.getSiType(lookupId as any);
      const result = mapSiType(api, siType, typeStr, depth);
      if (result.kind !== 'unknown') return result;
    } catch {
      // fall through
    }
  }

  // Fallback to getTypeDef (handles simple type strings)
  try {
    const typeDef = api.registry.lookup.getTypeDef(typeStr as any);

    return mapTypeDef(api, typeDef, depth);
  } catch {
    // Fallback: try to infer from type string directly
    return inferFromTypeString(api, typeStr, depth);
  }
}

/**
 * Map a SiType (Scale Info) directly to ParameterTypeDef. More reliable than
 * getTypeDef for complex composite/variant types.
 */
function mapSiType(api: ApiPromise, siType: any, name: string, depth: number): ParameterTypeDef {
  if (depth >= MAX_TYPE_RESOLUTION_DEPTH) {
    return { kind: 'unknown', typeName: name };
  }

  const displayName = name;

  // Check special names first
  if (isAccountType(displayName)) return { kind: 'accountId', typeName: displayName };
  if (isCallType(displayName)) return { kind: 'call', typeName: displayName };
  if (isBalanceType(displayName)) return { kind: 'balance', typeName: displayName };

  const result = mapSiTypeInner(api, siType, displayName, depth);

  // If displayName is a numeric lookup ID, replace with a derived readable name
  if (/^\d+$/.test(displayName) && result.typeName === displayName) {
    return { ...result, typeName: deriveTypeName(result) };
  }

  return result;
}

function deriveTypeName(td: ParameterTypeDef): string {
  switch (td.kind) {
    case 'compact':
      return `Compact<${td.inner?.typeName ?? '?'}>`;
    case 'vec':
      return `Vec<${td.inner?.typeName ?? '?'}>`;
    case 'option':
      return `Option<${td.inner?.typeName ?? '?'}>`;
    case 'tuple':
      return `(${td.fields?.map((f) => f.typeDef.typeName).join(', ') ?? ''})`;
    default:
      return td.typeName;
  }
}

function mapSiTypeInner(api: ApiPromise, siType: any, displayName: string, depth: number): ParameterTypeDef {
  const def = siType.def;

  if (def.isComposite) {
    // Struct
    const fields = def.asComposite.fields.map((field: any) => {
      const fieldName = field.name?.isSome ? field.name.unwrap().toString() : (field.typeName?.toString() ?? '0');
      const fieldTypeId = field.type.toString();

      return {
        name: fieldName,
        typeDef: resolveTypeDef(api, fieldTypeId, depth + 1),
      };
    });

    return { kind: 'struct', typeName: displayName, fields };
  }

  if (def.isVariant) {
    // Enum
    const variants = def.asVariant.variants.map((variant: any) => {
      const variantFields = variant.fields.map((field: any, fi: number) => {
        const fieldName = field.name?.isSome ? field.name.unwrap().toString() : `${fi}`;
        const fieldTypeId = field.type.toString();

        return {
          name: fieldName,
          typeDef: resolveTypeDef(api, fieldTypeId, depth + 1),
        };
      });

      return {
        name: variant.name.toString(),
        index: variant.index.toNumber(),
        fields: variantFields,
      };
    });

    return { kind: 'enum', typeName: displayName, variants };
  }

  if (def.isSequence) {
    const innerTypeId = def.asSequence.type.toString();

    // Vec<u8> is Bytes — treat as hex/string input, not array of numbers
    if (isU8Type(api, innerTypeId)) {
      return { kind: 'primitive', typeName: 'Bytes', primitiveType: 'bytes' };
    }

    const inner = resolveTypeDef(api, innerTypeId, depth + 1);

    return { kind: 'vec', typeName: displayName, inner };
  }

  if (def.isArray) {
    const innerTypeId = def.asArray.type.toString();

    // [u8; N] is also Bytes
    if (isU8Type(api, innerTypeId)) {
      return { kind: 'primitive', typeName: 'Bytes', primitiveType: 'bytes' };
    }

    const inner = resolveTypeDef(api, innerTypeId, depth + 1);

    return { kind: 'vec', typeName: displayName, inner };
  }

  if (def.isCompact) {
    const inner = resolveTypeDef(api, def.asCompact.type.toString(), depth + 1);

    if (inner.kind === 'primitive' && inner.primitiveType && BALANCE_INNER_TYPES.has(inner.primitiveType)) {
      return { kind: 'balance', typeName: displayName };
    }

    return { kind: 'compact', typeName: displayName, inner };
  }

  if (def.isTuple) {
    const ids: any[] = def.asTuple;
    if (ids.length === 0) {
      return { kind: 'primitive', typeName: '()', primitiveType: 'string' };
    }

    const fields = ids.map((id: any, i: number) => ({
      name: `${i}`,
      typeDef: resolveTypeDef(api, id.toString(), depth + 1),
    }));

    return { kind: 'tuple', typeName: displayName, fields };
  }

  if (def.isPrimitive) {
    const primStr = def.asPrimitive.toString().toLowerCase();
    const primName = primStr === 'str' ? 'string' : primStr;
    if (primStr === 'bool') return { kind: 'primitive', typeName: primName, primitiveType: 'bool' };
    if (primStr === 'str') return { kind: 'primitive', typeName: primName, primitiveType: 'string' };

    const prim = parsePrimitiveType(primStr);
    if (prim) return { kind: 'primitive', typeName: primName, primitiveType: prim };

    return { kind: 'unknown', typeName: displayName };
  }

  // BitSequence, HistoricMetaCompat, etc.
  return { kind: 'unknown', typeName: displayName };
}

function mapTypeDef(
  api: ApiPromise,
  td: { info: TypeDefInfo; type: string; sub?: any; name?: string; lookupName?: string; typeName?: string },
  depth: number,
): ParameterTypeDef {
  const displayName = td.lookupName ?? td.typeName ?? td.type;

  // Check for special recognized types by name
  if (isAccountType(displayName)) {
    return { kind: 'accountId', typeName: displayName };
  }

  if (isCallType(displayName)) {
    return { kind: 'call', typeName: displayName };
  }

  if (isBalanceType(displayName)) {
    return { kind: 'balance', typeName: displayName };
  }

  switch (td.info) {
    case TypeDefInfo.Plain: {
      return resolvePlainType(api, td.type, displayName, depth);
    }

    case TypeDefInfo.Compact: {
      const inner = td.sub ? mapTypeDef(api, td.sub, depth + 1) : { kind: 'unknown' as const, typeName: td.type };

      // Compact<u128> or Compact<u64> is typically a Balance
      if (inner.kind === 'primitive' && inner.primitiveType && BALANCE_INNER_TYPES.has(inner.primitiveType)) {
        return { kind: 'balance', typeName: displayName };
      }

      return { kind: 'compact', typeName: displayName, inner };
    }

    case TypeDefInfo.Option: {
      const inner = td.sub ? mapTypeDef(api, td.sub, depth + 1) : { kind: 'unknown' as const, typeName: td.type };

      return { kind: 'option', typeName: displayName, inner };
    }

    case TypeDefInfo.Vec:
    case TypeDefInfo.VecFixed:
    case TypeDefInfo.BTreeSet: {
      const inner = td.sub ? mapTypeDef(api, td.sub, depth + 1) : { kind: 'unknown' as const, typeName: td.type };

      // Vec<RuntimeCall> is a special case
      if (inner.kind === 'call') {
        return { kind: 'vec', typeName: displayName, inner };
      }

      return { kind: 'vec', typeName: displayName, inner };
    }

    case TypeDefInfo.Tuple: {
      const subs = Array.isArray(td.sub) ? td.sub : td.sub ? [td.sub] : [];
      const fields = subs.map((s: any, i: number) => ({
        name: `${i}`,
        typeDef: mapTypeDef(api, s, depth + 1),
      }));

      return { kind: 'tuple', typeName: displayName, fields };
    }

    case TypeDefInfo.Struct: {
      const subs = Array.isArray(td.sub) ? td.sub : td.sub ? [td.sub] : [];
      const fields = subs.map((s: any) => ({
        name: s.name ?? 'value',
        typeDef: mapTypeDef(api, s, depth + 1),
      }));

      return { kind: 'struct', typeName: displayName, fields };
    }

    case TypeDefInfo.Enum: {
      const subs = Array.isArray(td.sub) ? td.sub : td.sub ? [td.sub] : [];
      const variants = subs.map((s: any, i: number) => {
        const variantFields = Array.isArray(s.sub)
          ? s.sub.map((f: any, fi: number) => ({
              name: f.name ?? `${fi}`,
              typeDef: mapTypeDef(api, f, depth + 1),
            }))
          : s.sub
            ? [{ name: s.sub.name ?? '0', typeDef: mapTypeDef(api, s.sub, depth + 1) }]
            : [];

        return {
          name: s.name ?? `Variant${i}`,
          index: s.index ?? i,
          fields: variantFields,
        };
      });

      return { kind: 'enum', typeName: displayName, variants };
    }

    case TypeDefInfo.Result: {
      const subs = Array.isArray(td.sub) ? td.sub : [];
      const variants = [
        {
          name: 'Ok',
          index: 0,
          fields: subs[0] ? [{ name: 'value', typeDef: mapTypeDef(api, subs[0], depth + 1) }] : [],
        },
        {
          name: 'Err',
          index: 1,
          fields: subs[1] ? [{ name: 'error', typeDef: mapTypeDef(api, subs[1], depth + 1) }] : [],
        },
      ];

      return { kind: 'enum', typeName: displayName, variants };
    }

    case TypeDefInfo.BTreeMap:
    case TypeDefInfo.HashMap: {
      // Maps are represented as Vec<(K, V)>
      const subs = Array.isArray(td.sub) ? td.sub : [];
      if (subs.length === 2) {
        const tupleInner: ParameterTypeDef = {
          kind: 'tuple',
          typeName: `(${subs[0].type}, ${subs[1].type})`,
          fields: [
            { name: 'key', typeDef: mapTypeDef(api, subs[0], depth + 1) },
            { name: 'value', typeDef: mapTypeDef(api, subs[1], depth + 1) },
          ],
        };

        return { kind: 'vec', typeName: displayName, inner: tupleInner };
      }

      return { kind: 'unknown', typeName: displayName };
    }

    case TypeDefInfo.UInt: {
      const primitiveType = parsePrimitiveType(td.type);

      return primitiveType
        ? { kind: 'primitive', typeName: displayName, primitiveType }
        : { kind: 'unknown', typeName: displayName };
    }

    case TypeDefInfo.Int: {
      const primitiveType = parsePrimitiveType(td.type);

      return primitiveType
        ? { kind: 'primitive', typeName: displayName, primitiveType }
        : { kind: 'unknown', typeName: displayName };
    }

    case TypeDefInfo.Null:
    case TypeDefInfo.DoNotConstruct: {
      return { kind: 'primitive', typeName: '()', primitiveType: 'string' };
    }

    case TypeDefInfo.Si: {
      // Scale Info reference — resolve through lookup (try numeric first)
      const siId = Number(td.type);
      const siArg = !Number.isNaN(siId) && Number.isInteger(siId) ? siId : td.type;
      try {
        const resolved = api.registry.lookup.getTypeDef(siArg as any);

        return mapTypeDef(api, resolved, depth + 1);
      } catch {
        return { kind: 'unknown', typeName: displayName };
      }
    }

    default: {
      return { kind: 'unknown', typeName: displayName };
    }
  }
}

function resolvePlainType(api: ApiPromise, type: string, displayName: string, depth: number): ParameterTypeDef {
  if (type === 'bool' || type === 'Bool') {
    return { kind: 'primitive', typeName: displayName, primitiveType: 'bool' };
  }

  if (type === 'Text' || type === 'String' || type === 'Str') {
    return { kind: 'primitive', typeName: displayName, primitiveType: 'string' };
  }

  if (type === 'Bytes' || type === 'Vec<u8>' || type === 'Raw') {
    return { kind: 'primitive', typeName: displayName, primitiveType: 'bytes' };
  }

  const primitive = parsePrimitiveType(type);
  if (primitive) {
    return { kind: 'primitive', typeName: displayName, primitiveType: primitive };
  }

  if (isAccountType(type)) {
    return { kind: 'accountId', typeName: displayName };
  }

  if (isCallType(type)) {
    return { kind: 'call', typeName: displayName };
  }

  // Try to resolve through the registry as a named type
  const numId = Number(type);
  const lookupArg = !Number.isNaN(numId) && Number.isInteger(numId) ? numId : type;
  try {
    const resolved = api.registry.lookup.getTypeDef(lookupArg as any);
    if (resolved.info !== TypeDefInfo.Plain || resolved.type !== type) {
      return mapTypeDef(api, resolved, depth + 1);
    }
  } catch {
    // ignore
  }

  return { kind: 'unknown', typeName: displayName };
}

function inferFromTypeString(api: ApiPromise, typeStr: string, depth: number): ParameterTypeDef {
  if (typeStr === 'bool' || typeStr === 'Bool') {
    return { kind: 'primitive', typeName: typeStr, primitiveType: 'bool' };
  }

  const primitive = parsePrimitiveType(typeStr);
  if (primitive) {
    return { kind: 'primitive', typeName: typeStr, primitiveType: primitive };
  }

  if (isAccountType(typeStr)) {
    return { kind: 'accountId', typeName: typeStr };
  }

  if (isCallType(typeStr)) {
    return { kind: 'call', typeName: typeStr };
  }

  // Option<T>
  const optionMatch = typeStr.match(/^Option<(.+)>$/);
  if (optionMatch) {
    return { kind: 'option', typeName: typeStr, inner: resolveTypeDef(api, optionMatch[1]!, depth + 1) };
  }

  // Vec<T>
  const vecMatch = typeStr.match(/^(?:Vec|BoundedVec)<(.+?)(?:,\s*.+)?>$/);
  if (vecMatch) {
    return { kind: 'vec', typeName: typeStr, inner: resolveTypeDef(api, vecMatch[1]!, depth + 1) };
  }

  // Compact<T>
  const compactMatch = typeStr.match(/^Compact<(.+)>$/);
  if (compactMatch) {
    return { kind: 'compact', typeName: typeStr, inner: resolveTypeDef(api, compactMatch[1]!, depth + 1) };
  }

  return { kind: 'unknown', typeName: typeStr };
}

function parsePrimitiveType(typeStr: string): PrimitiveType | null {
  const lower = typeStr.toLowerCase();

  if (UNSIGNED_INT_TYPES.has(lower)) return lower as PrimitiveType;
  if (SIGNED_INT_TYPES.has(lower)) return lower as PrimitiveType;

  return null;
}

function isAccountType(typeName: string): boolean {
  return ACCOUNT_TYPE_NAMES.has(typeName) || typeName.includes('AccountId');
}

function isCallType(typeName: string): boolean {
  return CALL_TYPE_NAMES.has(typeName) || typeName === 'Box<RuntimeCall>' || typeName.endsWith('::RuntimeCall');
}

function isBalanceType(typeName: string): boolean {
  return BALANCE_TYPE_NAMES.has(typeName) || typeName.includes('Balance');
}

/**
 * Derive a human-readable name from SiType path (e.g. ["xcm", "v3", "junction",
 * "Junction"] → "Junction").
 */
function getSiTypeName(siType: any, fallback: string): string {
  const path = siType.path;
  if (path && path.length > 0) {
    return path[path.length - 1].toString();
  }

  return fallback;
}

/**
 * Check if a lookup type ID refers to u8 (used to detect Vec<u8> = Bytes).
 */
function isU8Type(api: ApiPromise, typeIdStr: string): boolean {
  const id = Number(typeIdStr);
  if (Number.isNaN(id)) return typeIdStr === 'u8';

  try {
    const siType = api.registry.lookup.getSiType(id as any);

    return siType.def.isPrimitive && siType.def.asPrimitive.toString().toLowerCase() === 'u8';
  } catch {
    return false;
  }
}

/**
 * Heuristic: detect if a parameter is balance-like based on resolved typeDef
 * and metadata typeName. Covers cases where type resolution doesn't detect
 * Compact<u128> as balance.
 */
function isBalanceLikeParam(typeDef: ParameterTypeDef, metaTypeName: string | null): boolean {
  // Check metadata typeName (e.g. "BalanceOf<T>", "<<T as Config>::Currency ...>::Balance")
  if (metaTypeName && (metaTypeName.includes('Balance') || metaTypeName.includes('Amount'))) {
    return true;
  }

  // Check typeName string for Compact<u128> or Compact<u64> patterns
  if (typeDef.kind === 'compact' && typeDef.typeName) {
    const name = typeDef.typeName;
    if (/Compact<u(?:128|64)>/.test(name)) {
      return true;
    }
  }

  // Check if it's a plain u128 with a balance-like name
  if (typeDef.kind === 'primitive' && (typeDef.primitiveType === 'u128' || typeDef.primitiveType === 'u64')) {
    if (metaTypeName && /[Bb]alance|[Aa]mount|[Vv]alue/.test(metaTypeName)) {
      return true;
    }
  }

  return false;
}
