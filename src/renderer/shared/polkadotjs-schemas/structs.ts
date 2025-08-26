import { Enum, Option } from '@polkadot/types';
import { type RefinementCtx, ZodOptional, z } from 'zod';

const safeParse = <T extends z.ZodType>(schema: T, value: unknown, ctx: RefinementCtx): z.infer<T> | never => {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  } else {
    for (const issue of result.error.issues) {
      ctx.addIssue(issue.message);
    }

    return z.NEVER;
  }
};

export const vecSchema = <T extends z.ZodTypeAny>(schema: T) => z.array(schema);

export const objectSchema = <const T extends Record<string, z.ZodType>>(v: T) => {
  const description = `{\n${Object.keys(v).join(',\n')}\n}`;

  return z
    .unknown()
    .transform((map, ctx) => {
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
        const isOptionalSchema = schema instanceof ZodOptional;
        let hasValue = false;
        let fieldValue;

        if (map instanceof Map) {
          if (map.has(key)) {
            fieldValue = map.get(key);
            hasValue = true;
          } else if (isOptionalSchema) {
            fieldValue = undefined;
            hasValue = true;
          }
        } else {
          if (key in map) {
            // @ts-expect-error dynamic data
            fieldValue = map[key];
            hasValue = true;
          } else if (isOptionalSchema) {
            fieldValue = undefined;
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
    })
    .describe(description);
};

export const optionalSchema = <const V extends z.ZodType>(schema: V) => {
  return z.instanceof(Option).transform((value, ctx) => {
    if (value.isNone) {
      return null;
    }

    return safeParse(schema, value.unwrap(), ctx) as z.infer<V>;
  });
};

export const enumTypeLooseSchema = <const Value extends string[]>(...args: Value) => {
  return z.instanceof(Enum).transform((value): Value[number] | (string & {}) => {
    const valid = args.includes(value.type);
    if (valid) {
      return value.type as Value[number];
    } else {
      console.warn(`Enum should be (${args.join(' | ')}), got ${value.type}.`);
      return value.type as string & {};
    }
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

export const tupleMapSchema = <const Entries extends [name: string, schema: z.ZodTypeAny][]>(...args: Entries) => {
  type EntriesTuple = [string, z.ZodTypeAny];

  type FromEntries<T extends EntriesTuple[]> = T['length'] extends 0
    ? NonNullable<unknown>
    : T extends [infer Head extends EntriesTuple, ...infer Tail extends EntriesTuple[]]
      ? Record<Head[0], z.infer<Head[1]>> & FromEntries<Tail>
      : never;

  const inputSchema = args.map((x) => x[1]);
  const missingSchemaIndex = inputSchema.findIndex((x) => x === undefined);
  if (missingSchemaIndex !== -1) {
    throw new TypeError(
      `Tuple map schema for field ${args.map((x) => x[1]).join(', ')} is missing schema at ${missingSchemaIndex}`,
    );
  }

  // @ts-expect-error dynamic data
  return z.tuple(inputSchema).transform((values) => {
    const result: Record<string, unknown> = {};

    for (const [index, value] of values.entries()) {
      const tuple = args[index];
      if (!tuple) throw new TypeError('Tuple is not defined');

      const key = tuple[0];
      if (!key) throw new TypeError('Tuple key is not defined');

      result[key] = value;
    }

    return result as FromEntries<Entries>;
  });
};

interface Class<T> {
  new (..._: any[]): T;
}

export const complexSchema = <Input, const Output>(constructor: Class<Input>, fn: (value: Input) => Output) =>
  // @ts-expect-error class constructor can't be instanciated
  z.instanceof<Class<Input>>(constructor).transform(fn);
