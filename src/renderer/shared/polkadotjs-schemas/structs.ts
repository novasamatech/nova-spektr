import { Enum, Option } from '@polkadot/types';
import { z } from 'zod';

const safeParse = <T extends z.ZodTypeAny>(schema: T, value: unknown, ctx: z.RefinementCtx): z.infer<T> | never => {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  } else {
    for (const issue of result.error.issues) {
      ctx.addIssue(issue);
    }

    return z.NEVER;
  }
};

export const vecSchema = <T extends z.ZodTypeAny>(schema: T) => z.array(schema);

export const objectSchema = <const T extends z.ZodRawShape>(v: T) => {
  return z.unknown().transform((map, ctx) => {
    type PolkadotJSObject = {
      [P in keyof T]: z.infer<T[P]>;
    };

    if (typeof map !== 'object' || map === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Value not an object`,
        fatal: true,
      });

      return z.NEVER;
    }

    const result: Record<string, unknown> = {};

    for (const [key, schema] of Object.entries(v)) {
      let fieldValue;
      let hasValue = false;
      if (map instanceof Map) {
        if (map.has(key)) {
          fieldValue = map.get(key);
          hasValue = true;
        }
      } else {
        if (key in map) {
          // @ts-expect-error dynamic data
          fieldValue = map[key];
          hasValue = true;
        }
      }

      if (!hasValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Object does not have key ${key}`,
          fatal: true,
        });

        return z.NEVER;
      }

      const field = safeParse(schema, fieldValue, ctx);
      if (field === z.NEVER) {
        return z.NEVER;
      }

      result[key] = field;
    }

    return result as PolkadotJSObject;
  });
};

export const optionalSchema = <const Value>(schema: z.ZodType<Value, z.ZodTypeDef, unknown>) => {
  return z.instanceof(Option).transform((value, ctx) => {
    if (value.isNone) {
      return null;
    }

    return safeParse(schema, value.unwrap(), ctx) as Value extends z.ZodType ? z.infer<Value> : Value;
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
      message: `Enum should be (${args.join(' | ')}), got ${value.type}`,
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
        // @ts-expect-error dynamic field
        const result = safeParse(specificSchema, enumValue[`as${type}`], ctx);

        if (result === z.NEVER) {
          return z.NEVER;
        }

        return {
          type,
          data: result,
        } as EnumVariant;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enum has incorrect shape - field as${type} should be fulfilled`,
        fatal: true,
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Schema "${type}" field is not specified`,
        fatal: true,
      });
    }

    return z.NEVER;
  });
};

export const enumValueLooseSchema = <const Map extends Record<string, z.ZodTypeAny>>(map: Map) => {
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
        // @ts-expect-error dynamic field
        const result = safeParse(specificSchema, enumValue[`as${type}`], ctx);

        if (result === z.NEVER) {
          return z.NEVER;
        }

        return {
          type,
          data: result,
        } as EnumVariant;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enum has incorrect shape - field as${type} should be fulfilled`,
        fatal: true,
      });
    } else {
      return {
        type: '__' as const,
        _: null,
      };
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
  const missingSchemaIndex = inputSchema.findIndex((x) => x === undefined);
  if (missingSchemaIndex !== -1) {
    throw new TypeError(
      `Tupple map schema for field ${args.map((x) => x[1]).join(', ')} is missing schema at ${missingSchemaIndex}`,
    );
  }

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
