import { type ApiPromise } from '@polkadot/api';
import { TypeDefInfo } from '@polkadot/types';

import { type ParameterTypeDef, type PrimitiveType, MAX_TYPE_RESOLUTION_DEPTH } from './types';

// --- Constants ---

const UNSIGNED_INT_TYPES = new Set(['u8', 'u16', 'u32', 'u64', 'u128', 'u256']);
const SIGNED_INT_TYPES = new Set(['i8', 'i16', 'i32', 'i64', 'i128']);

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

// --- Name-to-ID cache ---

const nameToIdCache = new WeakMap<object, Map<string, number>>();

function findLookupIdByName(api: ApiPromise, typeName: string): number | null {
  const registry = api.registry.lookup;

  let cache = nameToIdCache.get(registry);
  if (!cache) {
    cache = new Map();
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

// --- Main resolver ---

/**
 * Resolve a type string (from meta.args) into a structured ParameterTypeDef.
 * Tries: numeric lookup ID via getSiType → name lookup → getTypeDef → string
 * inference.
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

  // arg.type.toString() often returns type NAME — find lookup ID by name
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
    return inferFromTypeString(api, typeStr, depth);
  }
}

// --- SiType mapping (Scale Info) ---

function mapSiType(api: ApiPromise, siType: any, name: string, depth: number): ParameterTypeDef {
  if (depth >= MAX_TYPE_RESOLUTION_DEPTH) {
    return { kind: 'unknown', typeName: name };
  }

  if (isAccountType(name)) return { kind: 'accountId', typeName: name };
  if (isCallType(name)) return { kind: 'call', typeName: name };

  const result = withBalanceHint(mapSiTypeDef(api, siType, name, depth), name);

  // Replace numeric lookup ID with a derived readable name
  if (/^\d+$/.test(name) && result.typeName === name) {
    return { ...result, typeName: deriveTypeName(result) };
  }

  return result;
}

function mapSiTypeDef(api: ApiPromise, siType: any, displayName: string, depth: number): ParameterTypeDef {
  const def = siType.def;

  if (def.isComposite) {
    const compositeFields = def.asComposite.fields;

    // Single unnamed field = newtype wrapper (e.g. Xcm<Call>(Vec<Instruction>))
    // Codec flattens these, so the type tree should be transparent too
    if (compositeFields.length === 1 && !compositeFields[0].name?.isSome) {
      return resolveFieldTypeDef(api, compositeFields[0], depth + 1);
    }

    const fields = compositeFields.map((field: any) => {
      const fieldName = field.name?.isSome ? field.name.unwrap().toString() : (field.typeName?.toString() ?? '0');

      return { name: fieldName, typeDef: resolveFieldTypeDef(api, field, depth + 1) };
    });

    return { kind: 'struct', typeName: displayName, fields };
  }

  if (def.isVariant) {
    const variants = def.asVariant.variants.map((variant: any) => {
      const variantFields = variant.fields.map((field: any, fi: number) => {
        const fieldName = field.name?.isSome ? field.name.unwrap().toString() : `${fi}`;

        return { name: fieldName, typeDef: resolveFieldTypeDef(api, field, depth + 1) };
      });

      return { name: variant.name.toString(), index: variant.index.toNumber(), fields: variantFields };
    });

    return { kind: 'enum', typeName: displayName, variants };
  }

  if (def.isSequence) {
    const innerTypeId = def.asSequence.type.toString();
    if (isU8Type(api, innerTypeId)) return { kind: 'primitive', typeName: 'Bytes', primitiveType: 'bytes' };

    return { kind: 'vec', typeName: displayName, inner: resolveTypeDef(api, innerTypeId, depth + 1) };
  }

  if (def.isArray) {
    const innerTypeId = def.asArray.type.toString();
    if (isU8Type(api, innerTypeId)) return { kind: 'primitive', typeName: 'Bytes', primitiveType: 'bytes' };

    return { kind: 'vec', typeName: displayName, inner: resolveTypeDef(api, innerTypeId, depth + 1) };
  }

  if (def.isCompact) {
    const inner = resolveTypeDef(api, def.asCompact.type.toString(), depth + 1);

    return { kind: 'compact', typeName: displayName, inner };
  }

  if (def.isTuple) {
    const ids: any[] = def.asTuple;
    if (ids.length === 0) return { kind: 'primitive', typeName: '()', primitiveType: 'string' };

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

  return { kind: 'unknown', typeName: displayName };
}

// --- TypeDef mapping (getTypeDef fallback) ---

type LegacyTypeDef = {
  info: TypeDefInfo;
  type: string;
  sub?: any;
  name?: string;
  lookupName?: string;
  typeName?: string;
};

function mapTypeDef(api: ApiPromise, td: LegacyTypeDef, depth: number): ParameterTypeDef {
  const displayName = td.lookupName ?? td.typeName ?? td.type;

  if (isAccountType(displayName)) return { kind: 'accountId', typeName: displayName };
  if (isCallType(displayName)) return { kind: 'call', typeName: displayName };

  return withBalanceHint(mapTypeDefInfo(api, td, displayName, depth), displayName);
}

function mapTypeDefInfo(api: ApiPromise, td: LegacyTypeDef, displayName: string, depth: number): ParameterTypeDef {
  switch (td.info) {
    case TypeDefInfo.Plain:
      return resolvePlainType(api, td.type, displayName, depth);

    case TypeDefInfo.Compact: {
      const inner = td.sub ? mapTypeDef(api, td.sub, depth + 1) : { kind: 'unknown' as const, typeName: td.type };

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

      return { kind: 'vec', typeName: displayName, inner };
    }

    case TypeDefInfo.Tuple: {
      const subs = Array.isArray(td.sub) ? td.sub : td.sub ? [td.sub] : [];

      return {
        kind: 'tuple',
        typeName: displayName,
        fields: subs.map((s: any, i: number) => ({ name: `${i}`, typeDef: mapTypeDef(api, s, depth + 1) })),
      };
    }

    case TypeDefInfo.Struct: {
      const subs = Array.isArray(td.sub) ? td.sub : td.sub ? [td.sub] : [];

      return {
        kind: 'struct',
        typeName: displayName,
        fields: subs.map((s: any) => ({ name: s.name ?? 'value', typeDef: mapTypeDef(api, s, depth + 1) })),
      };
    }

    case TypeDefInfo.Enum: {
      const subs = Array.isArray(td.sub) ? td.sub : td.sub ? [td.sub] : [];
      const variants = subs.map((s: any, i: number) => {
        const variantFields = Array.isArray(s.sub)
          ? s.sub.map((f: any, fi: number) => ({ name: f.name ?? `${fi}`, typeDef: mapTypeDef(api, f, depth + 1) }))
          : s.sub
            ? [{ name: s.sub.name ?? '0', typeDef: mapTypeDef(api, s.sub, depth + 1) }]
            : [];

        return { name: s.name ?? `Variant${i}`, index: s.index ?? i, fields: variantFields };
      });

      return { kind: 'enum', typeName: displayName, variants };
    }

    case TypeDefInfo.Result: {
      const subs = Array.isArray(td.sub) ? td.sub : [];

      return {
        kind: 'enum',
        typeName: displayName,
        variants: [
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
        ],
      };
    }

    case TypeDefInfo.BTreeMap:
    case TypeDefInfo.HashMap: {
      const subs = Array.isArray(td.sub) ? td.sub : [];
      if (subs.length === 2) {
        return {
          kind: 'vec',
          typeName: displayName,
          inner: {
            kind: 'tuple',
            typeName: `(${subs[0].type}, ${subs[1].type})`,
            fields: [
              { name: 'key', typeDef: mapTypeDef(api, subs[0], depth + 1) },
              { name: 'value', typeDef: mapTypeDef(api, subs[1], depth + 1) },
            ],
          },
        };
      }

      return { kind: 'unknown', typeName: displayName };
    }

    case TypeDefInfo.UInt:
    case TypeDefInfo.Int: {
      const primitiveType = parsePrimitiveType(td.type);

      return primitiveType
        ? { kind: 'primitive', typeName: displayName, primitiveType }
        : { kind: 'unknown', typeName: displayName };
    }

    case TypeDefInfo.Null:
    case TypeDefInfo.DoNotConstruct:
      return { kind: 'primitive', typeName: '()', primitiveType: 'string' };

    case TypeDefInfo.Si: {
      const siId = Number(td.type);
      const siArg = !Number.isNaN(siId) && Number.isInteger(siId) ? siId : td.type;
      try {
        return mapTypeDef(api, api.registry.lookup.getTypeDef(siArg as any), depth + 1);
      } catch {
        return { kind: 'unknown', typeName: displayName };
      }
    }

    default:
      return { kind: 'unknown', typeName: displayName };
  }
}

// --- Helpers ---

function resolvePlainType(api: ApiPromise, type: string, displayName: string, depth: number): ParameterTypeDef {
  if (type === 'bool' || type === 'Bool') return { kind: 'primitive', typeName: displayName, primitiveType: 'bool' };
  if (type === 'Text' || type === 'String' || type === 'Str')
    return { kind: 'primitive', typeName: displayName, primitiveType: 'string' };
  if (type === 'Bytes' || type === 'Vec<u8>' || type === 'Raw')
    return { kind: 'primitive', typeName: displayName, primitiveType: 'bytes' };

  const primitive = parsePrimitiveType(type);
  if (primitive) return { kind: 'primitive', typeName: displayName, primitiveType: primitive };
  if (isAccountType(type)) return { kind: 'accountId', typeName: displayName };
  if (isCallType(type)) return { kind: 'call', typeName: displayName };

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
  if (typeStr === 'bool' || typeStr === 'Bool') return { kind: 'primitive', typeName: typeStr, primitiveType: 'bool' };

  const primitive = parsePrimitiveType(typeStr);
  if (primitive) return { kind: 'primitive', typeName: typeStr, primitiveType: primitive };
  if (isAccountType(typeStr)) return { kind: 'accountId', typeName: typeStr };
  if (isCallType(typeStr)) return { kind: 'call', typeName: typeStr };

  const optionMatch = typeStr.match(/^Option<(.+)>$/);
  if (optionMatch) return { kind: 'option', typeName: typeStr, inner: resolveTypeDef(api, optionMatch[1]!, depth + 1) };

  const vecMatch = typeStr.match(/^(?:Vec|BoundedVec)<(.+?)(?:,\s*.+)?>$/);
  if (vecMatch) return { kind: 'vec', typeName: typeStr, inner: resolveTypeDef(api, vecMatch[1]!, depth + 1) };

  const compactMatch = typeStr.match(/^Compact<(.+)>$/);
  if (compactMatch)
    return { kind: 'compact', typeName: typeStr, inner: resolveTypeDef(api, compactMatch[1]!, depth + 1) };

  return { kind: 'unknown', typeName: typeStr };
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

/**
 * Whether a metadata type name denotes a balance: the last path segment,
 * without generic arguments, ends in `Balance` or `BalanceOf` (`T::Balance`,
 * `BalanceOf<T>`, `<T as Config>::Balance`, `AssetBalanceOf<T, I>`). Wrappers
 * such as `Option<BalanceOf<T>>` and names like `BalanceStatus` don't match.
 */
export function isBalanceTypeName(typeName: string): boolean {
  let head = typeName.replace(/\s+/g, '');
  if (head.startsWith('<')) {
    const qualifiedEnd = head.lastIndexOf('>::');
    if (qualifiedEnd === -1) return false;
    head = head.slice(qualifiedEnd + 3);
  }

  const segment = head.split('<')[0]?.split('::').pop() ?? '';

  return /Balance(?:Of)?$/.test(segment);
}

/**
 * Mark an integer as a balance when its metadata type name says so. The shape
 * alone (`Compact<u128>`, `u64`) is never enough: weights, timestamps and
 * indices share it.
 */
export function withBalanceHint(typeDef: ParameterTypeDef, typeName: string | null): ParameterTypeDef {
  if (!typeName) return typeDef;

  const optionMatch = typeName.match(/^Option<(.+)>$/);
  if (typeDef.kind === 'option' && typeDef.inner && optionMatch?.[1]) {
    return { ...typeDef, inner: withBalanceHint(typeDef.inner, optionMatch[1]) };
  }

  if (isBalanceTypeName(typeName) && isIntegerLike(typeDef)) {
    return { kind: 'balance', typeName: typeDef.typeName };
  }

  return typeDef;
}

function isIntegerLike(typeDef: ParameterTypeDef): boolean {
  switch (typeDef.kind) {
    case 'primitive':
      return typeDef.primitiveType !== undefined && UNSIGNED_INT_TYPES.has(typeDef.primitiveType);
    case 'compact':
      return typeDef.inner !== undefined && isIntegerLike(typeDef.inner);
    // Unresolved type carrying a balance name — still an amount
    case 'unknown':
    case 'balance':
      return true;
    default:
      return false;
  }
}

function resolveFieldTypeDef(api: ApiPromise, field: any, depth: number): ParameterTypeDef {
  const fieldTypeName = field.typeName?.isSome ? field.typeName.unwrap().toString() : null;

  return withBalanceHint(resolveTypeDef(api, field.type.toString(), depth), fieldTypeName);
}

function getSiTypeName(siType: any, fallback: string): string {
  const path = siType.path;
  if (path && path.length > 0) return path[path.length - 1].toString();

  return fallback;
}

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
