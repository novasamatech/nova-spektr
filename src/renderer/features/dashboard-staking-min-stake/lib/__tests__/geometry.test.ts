import { VIEW, buildStepGeometry } from '../geometry';

describe('buildStepGeometry', () => {
  test('should draw one flat segment per column and close the area on the baseline', () => {
    const geometry = buildStepGeometry([100, 200], (value) => value);

    expect(geometry.linePoints).toBe('0.0,100.0 500.0,100.0 500.0,200.0 1000.0,200.0');
    expect(geometry.areaPoints).toBe(`${geometry.linePoints} ${VIEW},${VIEW} 0,${VIEW}`);
  });

  test('should lift the last column as the active segment, from the previous step', () => {
    expect(buildStepGeometry([100, 200], (value) => value).activePoints).toBe('500.0,100.0 500.0,200.0 1000,200.0');
  });

  test('should give a single era an active segment across the whole plot', () => {
    expect(buildStepGeometry([150], (value) => value).activePoints).toBe('0.0,150.0 0.0,150.0 1000,150.0');
  });
});
