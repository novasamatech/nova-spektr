import { convertLocationToUrlJson } from '@paraspell/xcm-analyser';
import { z } from 'zod';

import { nonNullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type JsonObject = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonObject => value !== null && typeof value === 'object';

/**
 * Capitalizes first letter and normalizes id suffixes (accountId32 ->
 * AccountId32)
 */
const capitalizeKey = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1).replace(/id(\d+)/i, 'Id$1');

const transformInteriorElement = (element: JsonObject): JsonObject =>
  Object.fromEntries(Object.entries(element).map(([key, value]) => [capitalizeKey(key), value]));

/** Matches XCM junction keys like x1, x2, X3, etc. */
const isJunctionKey = (key: string): boolean => /^x\d+$/i.test(key);

const transformInterior = (interior: JsonObject): JsonObject => {
  const result: JsonObject = {};

  for (const [key, value] of Object.entries(interior)) {
    if (!isJunctionKey(key) || !Array.isArray(value) || value.length === 0) {
      result[key] = value;
      continue;
    }

    const firstElement = value[0];
    if (typeof firstElement === 'object' && nonNullable(firstElement)) {
      result[key.toUpperCase()] = transformInteriorElement(firstElement);
    }
  }

  return result;
};

/**
 * Transforms the internal XCM location object format to the format expected by
 * ParaSpell library. Converts lowercase keys (x1, accountId32) to uppercase
 * (X1, AccountId32) and array format to object format.
 */
export const transformLocationToLibraryFormat = (location: JsonObject): unknown => {
  if (!isRecord(location.interior)) return location;

  try {
    return {
      ...('parents' in location && { parents: location.parents }),
      interior: transformInterior(location.interior),
    };
  } catch {
    return location;
  }
};

/**
 * Extracts AccountId32 from a location object using ParaSpell library.
 */
export const extractAccountIdFromLocation = (location: unknown): AccountId | undefined => {
  if (!isRecord(location)) return undefined;

  try {
    const transformedLocation = transformLocationToLibraryFormat(location);
    const transformedLocationJson = JSON.stringify(transformedLocation);

    const locationUrl = convertLocationToUrlJson(transformedLocationJson);

    const accountIdMatch = locationUrl.match(/AccountId32\([^,]*,\s*([^)]+)\)/);
    if (accountIdMatch && accountIdMatch[1]) {
      return toAccountId(accountIdMatch[1].trim());
    }
  } catch {
    console.error('Error extracting account ID from location', location);
  }

  return undefined;
};

const xcmInstructionSchema = z.object({
  depositAsset: z.object({ beneficiary: z.unknown() }).optional(),
});

const xcmInstructionsSchema = z.object({
  v4: z.array(xcmInstructionSchema),
});

const jsonStringSchema = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });

    return z.NEVER;
  }
});

/**
 * Extracts beneficiary account ID from XCM instructions in customXcmOnDest.
 * Prioritizes direct DepositAsset instructions over SetAppendix ones.
 */
export const extractBeneficiaryFromXcmInstructions = (customXcmOnDest: string): AccountId | undefined => {
  const result = jsonStringSchema.pipe(xcmInstructionsSchema).safeParse(customXcmOnDest);
  if (!result.success) return undefined;

  for (const instruction of result.data.v4) {
    const beneficiary = instruction.depositAsset?.beneficiary;
    if (!beneficiary) continue;

    const accountId = extractAccountIdFromLocation(beneficiary);
    if (accountId) return accountId;
  }

  return undefined;
};
