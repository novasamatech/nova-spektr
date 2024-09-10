export const gridSpaceConverter = (value: number) => {
  // We assume that default font size is 16px.
  // Grid step - 0.25em
  return (16 / 4) * value;
};
