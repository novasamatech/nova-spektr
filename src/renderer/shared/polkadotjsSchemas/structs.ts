import { Enum, Option } from '@polkadot/types';
import { z } from 'zod';

export const objectSchema = <const T extends z.ZodRawShape>(v: T) => {
  return z.map(z.string(), z.unknown()).transform((map) => {
    type PolkadotJSObject = {
      [P in keyof T]: z.infer<T[P]>;
    };

    const result: Record<string, unknown> = {};

    for (const [key, schema] of Object.entries(v)) {
      result[key] = schema.parse(map.get(key));
    }

    return result as PolkadotJSObject;
  });
};

export const optionalSchema = <const Value>(schema: z.ZodType<Value, z.ZodTypeDef, unknown>) => {
  return z.instanceof(Option).transform((value) => {
    if (value.isNone) {
      return null;
    }

    return schema.parse(value) as Value extends z.ZodType ? z.infer<Value> : Value;
  });
};

export const enumTypeSchema = <const Value extends string[]>(...args: Value) => {
  return z.instanceof(Enum).transform((value, ctx) => {
    const valid = args.includes(value.type);
    if (valid) {
      return value.type as Value[number];
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Enum ${ctx.path.join('.')} should be (${args.join(' | ')}), got ${value.type}`,
      fatal: true,
    });

    return z.NEVER;
  });
};

export const enumValueSchema = <const Map extends Record<string, z.ZodTypeAny>>(map: Map) => {
  type EnumVariant = {
    [K in keyof Map]: {
      type: K;
      data: z.infer<Map[K]>;
    };
  }[keyof Map];

  return z.instanceof(Enum).transform((enumValue, ctx) => {
    const type = enumValue.type;

    if (type in map) {
      const specificSchema = map[type];

      // @ts-expect-error dynamic field
      if (enumValue[`is${type}`]) {
        return {
          type,
          // @ts-expect-error dynamic field
          data: specificSchema.parse(enumValue[`as${type}`]),
        } as EnumVariant;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enum ${ctx.path.join('.')} has incorrect shape - field as${type} should be fulfilled`,
        fatal: true,
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Schema "${type}" for enum ${ctx.path.join('.')} is not specified`,
        fatal: true,
      });
    }

    return z.NEVER;
  });
};

export const tuppleMapSchema = <const Entries extends [name: string, schema: z.ZodTypeAny][]>(...args: Entries) => {
  type EntriesTupple = [string, z.ZodTypeAny];

  type FromEntries<T extends EntriesTupple[]> = T['length'] extends 0
    ? NonNullable<unknown>
    : T extends [infer Head extends EntriesTupple, ...infer Tail extends EntriesTupple[]]
      ? Record<Head[0], z.infer<Head[1]>> & FromEntries<Tail>
      : never;

  type Result = FromEntries<Entries>;

  const inputSchema = args.map((x) => x[1]);

  // @ts-expect-error dynamic data
  return z.tuple(inputSchema).transform((values) => {
    const result: Record<string, unknown> = {};

    for (const [index, value] of values.entries()) {
      const tupple = args[index];
      if (!tupple) throw new TypeError('Tupple is not defined');

      const key = tupple[0];
      if (!key) throw new TypeError('Tupple key is not defined');

      result[key] = value;
    }

    return result as Result;
  });
};

interface Class<T> {
  new (..._: any[]): T;
}

export const complexSchema = <Input, const Output>(constructor: Class<Input>, fn: (value: Input) => Output) =>
  // @ts-expect-error class constructor can't be instanciated
  z.instanceof<Class<Input>>(constructor).transform(fn);
