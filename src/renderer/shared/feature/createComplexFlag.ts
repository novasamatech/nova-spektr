import { createEvent, createStore, sample } from 'effector';

type Flag<T extends string = string> = [name: T, value: boolean];
type Params<Reasons extends string[]> = {
  reasons: Reasons;
};

export const createComplexFlag = <const Reasons extends string[]>({ reasons }: Params<Reasons>) => {
  const changeFlag = createEvent<Flag<Reasons[number]>>({ name: 'changeFlag' });
  const enable = changeFlag.prepend((reason: Reasons[number]) => [reason, true]);
  const disable = changeFlag.prepend((reason: Reasons[number]) => [reason, false]);

  const $flags = createStore<Flag<Reasons[number]>[]>(
    Array.from(reasons)
      .reverse()
      .map(reason => [reason, false]),
    { name: 'flags' },
  );

  const $flag = $flags.map(flags => flags.some(v => v[1]));

  sample({
    clock: changeFlag,
    source: $flags,
    fn(flags, value) {
      const index = flags.findIndex(v => v[0] === value[0]);

      if (index === -1) {
        return flags;
      }

      if (value[1]) {
        if (flags[index]?.[1] === value[1]) {
          return flags;
        }

        return flags.map(v => (v[0] === value[0] ? value : v));
      }

      return flags.map((v, i) => {
        if (i < index) {
          return [v[0], false] as Flag<Reasons[number]>;
        }
        if (i === index) {
          return value;
        }

        return v;
      });
    },
    target: $flags,
  });

  return {
    $flag,
    enable,
    disable,
  };
};
