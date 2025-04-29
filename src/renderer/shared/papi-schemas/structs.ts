import { Enum } from '@polkadot/types';
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

export const enumTypeSchema = <T extends [string, ...string[]]>(...variants: T) => {
  const enumSchema = z.enum(variants);

  return z.object({ type: enumSchema, value: z.unknown() }).transform((value, ctx) => {
    try {
      enumSchema.parse(value.type);

      return value.type as T[number];
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enum should be one of (${variants.join(' | ')}), got ${value.type}`,
        fatal: true,
      });

      return z.NEVER;
    }
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
