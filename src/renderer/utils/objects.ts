export const arrayToObject = (array: any[], key: string): Record<string, any> => {
  return array.reduce((obj, item) => {
    obj[item[key]] = item;

    return obj;
  }, {});
};

export function notNull<T>(value: T | null | undefined): value is T {
  return value === null && value !== undefined;
}
