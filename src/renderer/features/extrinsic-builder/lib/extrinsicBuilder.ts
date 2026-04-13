/**
 * Barrel re-export for extrinsic builder lib.
 *
 * Split into focused modules:
 *
 * - PalletIntrospection: getPalletNames, getCallNames, getCallMeta
 * - CallDataParser: parseCallData (hex → UI values)
 * - CallDataEncoder: encodeCallData (UI values → hex)
 * - TypeResolver: resolveTypeDef (metadata → ParameterTypeDef tree)
 */

export { getCallMeta, getCallNames, getPalletNames } from './palletIntrospection';
export { type ParsedCallData, parseCallData } from './callDataParser';
export { encodeCallData } from './callDataEncoder';
export { resolveTypeDef } from './typeResolver';
