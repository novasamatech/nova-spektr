import { type AbsoluteMultiLocation, type Junction, type RelativeMultiLocation } from './location-types';

function areJunctionsEqual(junction1: Junction, junction2: Junction): boolean {
  return JSON.stringify(junction1) === JSON.stringify(junction2);
}

function findLastCommonJunctionIndex(
  location1: AbsoluteMultiLocation,
  location2: AbsoluteMultiLocation,
): number | null {
  let lastCommonIndex = -1;

  const minLength = Math.min(location1.interior.length, location2.interior.length);

  for (let i = 0; i < minLength; i++) {
    if (areJunctionsEqual(location1.interior[i], location2.interior[i])) {
      lastCommonIndex = i;
    } else {
      break;
    }
  }

  return lastCommonIndex >= 0 ? lastCommonIndex : null;
}

function reanchorAbsoluteLocation(
  location: AbsoluteMultiLocation,
  pointOfView: AbsoluteMultiLocation,
): RelativeMultiLocation {
  const lastCommonIndex = findLastCommonJunctionIndex(location, pointOfView);
  const firstDistinctIndex = lastCommonIndex !== null ? lastCommonIndex + 1 : 0;

  const parents = pointOfView.interior.length - firstDistinctIndex;
  const interior = location.interior.slice(firstDistinctIndex);

  return {
    parents,
    interior,
  };
}

function restoreAbsoluteLocation(
  relativeLocation: RelativeMultiLocation,
  pointOfView: AbsoluteMultiLocation,
): AbsoluteMultiLocation {
  if (relativeLocation.parents < 0) {
    throw new Error('Parents cannot be negative');
  }

  if (relativeLocation.parents > pointOfView.interior.length) {
    throw new Error(
      `Invalid relative location from given pov: ` +
        `Relative location has ${relativeLocation.parents} parents whereas pov has only ${pointOfView.interior.length} junctions`,
    );
  }

  const base = pointOfView.interior.slice(0, pointOfView.interior.length - relativeLocation.parents);
  const resultJunctions = [...base, ...relativeLocation.interior];

  return {
    interior: resultJunctions,
  };
}

export const multiLocationService = {
  reanchorAbsoluteLocation,
  restoreAbsoluteLocation,
};
