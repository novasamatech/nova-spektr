import {
  createAbsoluteMultiLocation,
  createHere,
  createParachainJunction,
  createRelativeMultiLocation,
} from '../location-types';
import { multiLocationService } from '../multi-location-service';

describe('shared/api/xcm/lib/multi-location-service', () => {
  describe('reanchorAbsoluteLocation', () => {
    test('reanchor global pov should remain unchanged', () => {
      const initial = createAbsoluteMultiLocation(createParachainJunction(1000));
      const pov = createAbsoluteMultiLocation(...createHere());
      const expected = createRelativeMultiLocation(0, createParachainJunction(1000));

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });

    test('reanchor no common junctions', () => {
      const initial = createAbsoluteMultiLocation(createParachainJunction(1000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(2000));
      const expected = createRelativeMultiLocation(1, createParachainJunction(1000));

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });

    test('reanchor one common junction', () => {
      const initial = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(3000));
      const expected = createRelativeMultiLocation(1, createParachainJunction(2000));

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });

    test('reanchor all common junction', () => {
      const initial = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const expected = createRelativeMultiLocation(0);

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });

    test('reanchor global to global', () => {
      const initial = createAbsoluteMultiLocation(...createHere());
      const pov = createAbsoluteMultiLocation(...createHere());
      const expected = createRelativeMultiLocation(0);

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });

    test('reanchor pov is successor of initial', () => {
      const initial = createAbsoluteMultiLocation(...createHere());
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000));
      const expected = createRelativeMultiLocation(1);

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });

    test('reanchor initial is successor of pov', () => {
      const initial = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000));
      const expected = createRelativeMultiLocation(0, createParachainJunction(2000));

      const result = multiLocationService.reanchorAbsoluteLocation(initial, pov);

      expect(result).toEqual(expected);
    });
  });

  describe('restoreAbsoluteLocation', () => {
    test('restore global pov should remain unchanged', () => {
      const expected = createAbsoluteMultiLocation(createParachainJunction(1000));
      const pov = createAbsoluteMultiLocation(...createHere());

      const relative = createRelativeMultiLocation(0, createParachainJunction(1000));

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('restore no common junctions', () => {
      const expected = createAbsoluteMultiLocation(createParachainJunction(1000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(2000));

      const relative = createRelativeMultiLocation(1, createParachainJunction(1000));

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('restore one common junction', () => {
      const expected = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(3000));

      const relative = createRelativeMultiLocation(1, createParachainJunction(2000));

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('restore all common junction', () => {
      const expected = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));

      const relative = createRelativeMultiLocation(0);

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('restore global to global', () => {
      const expected = createAbsoluteMultiLocation(...createHere());
      const pov = createAbsoluteMultiLocation(...createHere());

      const relative = createRelativeMultiLocation(0);

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('restore pov is successor of initial', () => {
      const expected = createAbsoluteMultiLocation(...createHere());
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000));

      // Target is ancestor of POV: go up 1, then Here
      const relative = createRelativeMultiLocation(1);

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('restore initial is successor of pov', () => {
      const expected = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000));

      const relative = createRelativeMultiLocation(0, createParachainJunction(2000));

      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);
      expect(restored).toEqual(expected);
    });

    test('should throw error for negative parents', () => {
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000));
      const relative = createRelativeMultiLocation(-1, createParachainJunction(2000));

      expect(() => {
        multiLocationService.restoreAbsoluteLocation(relative, pov);
      }).toThrow('Parents cannot be negative');
    });

    test('should throw error when parents exceed pov junctions', () => {
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000));
      const relative = createRelativeMultiLocation(2, createParachainJunction(2000));

      expect(() => {
        multiLocationService.restoreAbsoluteLocation(relative, pov);
      }).toThrow(
        'Invalid relative location from given pov: Relative location has 2 parents whereas pov has only 1 junctions',
      );
    });

    test('bidirectional test: reanchor then restore should return original', () => {
      const original = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(3000));

      // Reanchor to relative
      const relative = multiLocationService.reanchorAbsoluteLocation(original, pov);

      // Restore back to absolute
      const restored = multiLocationService.restoreAbsoluteLocation(relative, pov);

      expect(restored).toEqual(original);
    });

    test('bidirectional test: restore then reanchor should return original relative', () => {
      const relative = createRelativeMultiLocation(1, createParachainJunction(2000));
      const pov = createAbsoluteMultiLocation(createParachainJunction(1000), createParachainJunction(3000));

      // Restore to absolute
      const absolute = multiLocationService.restoreAbsoluteLocation(relative, pov);

      // Reanchor back to relative
      const reanchored = multiLocationService.reanchorAbsoluteLocation(absolute, pov);

      expect(reanchored).toEqual(relative);
    });
  });
});
