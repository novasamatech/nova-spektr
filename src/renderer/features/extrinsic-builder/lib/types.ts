export type PrimitiveType =
  | 'bool'
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'u256'
  | 'i8'
  | 'i16'
  | 'i32'
  | 'i64'
  | 'i128'
  | 'string'
  | 'bytes';

export type ParameterKind =
  | 'primitive'
  | 'accountId'
  | 'balance'
  | 'compact'
  | 'option'
  | 'vec'
  | 'tuple'
  | 'enum'
  | 'struct'
  | 'call'
  | 'unknown';

export type ParameterTypeDefField = {
  name: string;
  typeDef: ParameterTypeDef;
};

export type EnumVariant = {
  name: string;
  index: number;
  fields: ParameterTypeDefField[];
};

export type ParameterTypeDef = {
  kind: ParameterKind;
  typeName: string;
  primitiveType?: PrimitiveType;
  inner?: ParameterTypeDef;
  fields?: ParameterTypeDefField[];
  variants?: EnumVariant[];
};

export type CallArgDef = {
  name: string;
  typeDef: ParameterTypeDef;
};

export type CallMeta = {
  args: CallArgDef[];
  docs: string[];
};

export const MAX_BUILDER_DEPTH = 3;
export const MAX_TYPE_RESOLUTION_DEPTH = 8;
