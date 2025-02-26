import { type Effect, restore } from 'effector';
import { once } from 'patronum';

export const populated = (effect: Effect<any, any>) => {
  return restore(
    once(effect.done).map(() => true),
    false,
  );
};
