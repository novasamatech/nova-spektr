import { convertLocationToUrlJson } from '@paraspell/xcm-analyser';

import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * Transforms the internal XCM location object format to the format expected by
 * ParaSpell library. Converts lowercase keys (x1, accountId32) to uppercase
 * (X1, AccountId32) and array format to object format.
 */
export const transformLocationToLibraryFormat = (location: unknown): unknown => {
  if (!location || typeof location !== 'object' || location === null) return location;

  try {
    const locationObj = location;
    if (!('interior' in locationObj) || typeof locationObj.interior !== 'object' || locationObj.interior === null) {
      return location;
    }

    const transformed: Record<string, unknown> = {};

    if ('parents' in locationObj) {
      transformed.parents = locationObj.parents;
    }

    const interior = locationObj.interior;
    const transformedInterior: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(interior)) {
      const upperKey = key.toUpperCase();
      if (key.match(/^x\d+$/i) && Array.isArray(value) && value.length > 0) {
        const firstElement = value[0];
        if (firstElement && typeof firstElement === 'object' && firstElement !== null) {
          const transformedElement: Record<string, unknown> = {};
          for (const [innerKey, innerValue] of Object.entries(firstElement)) {
            const capitalizedKey = innerKey
              .charAt(0)
              .toUpperCase()
              .concat(innerKey.slice(1).replace(/id(\d+)/i, 'Id$1'));
            transformedElement[capitalizedKey] = innerValue;
          }
          transformedInterior[upperKey] = transformedElement;
        }
      } else {
        transformedInterior[key] = value;
      }
    }

    transformed.interior = transformedInterior;
    return transformed;
  } catch {
    return location;
  }
};

/**
 * Extracts AccountId32 from a location object using ParaSpell library.
 */
export const extractAccountIdFromLocation = (location: unknown): AccountId | undefined => {
  if (!location || typeof location !== 'object') return undefined;

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

/**
 * Extracts beneficiary account ID from XCM instructions in customXcmOnDest.
 * Prioritizes direct DepositAsset instructions over SetAppendix ones.
 */
export const extractBeneficiaryFromXcmInstructions = (customXcmOnDest: unknown): AccountId | undefined => {
  if (typeof customXcmOnDest !== 'string') return undefined;

  try {
    const xcmInstructions = JSON.parse(customXcmOnDest);
    if (!xcmInstructions?.v4 || !Array.isArray(xcmInstructions.v4)) return undefined;

    for (const instruction of xcmInstructions.v4) {
      const beneficiary = instruction?.depositAsset?.beneficiary;
      if (beneficiary) {
        const accountId = extractAccountIdFromLocation(beneficiary);
        if (accountId) return accountId;
      }
    }
  } catch {
    console.error('Error extracting beneficiary from XCM instructions', customXcmOnDest);
  }

  return undefined;
};
