export const countSteps = (min: number, max: number, stepSize: number) => {
  const steps = max - min;
  const remainder = stepSize ? steps % stepSize : 0;

  return remainder ? steps : steps / (stepSize ?? 1) + 1;
};
