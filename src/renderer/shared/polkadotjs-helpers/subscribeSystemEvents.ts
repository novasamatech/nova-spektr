import { type ApiPromise } from '@polkadot/api';
import { type Event } from '@polkadot/types/interfaces/system';

type SubscribeSystemEventsParams = {
  api: ApiPromise;
  section: string;
  methods?: string[];
};

export const subscribeSystemEvents = (
  { api, section, methods }: SubscribeSystemEventsParams,
  fn: (event: Event) => unknown,
) => {
  const isValidEvent = (event: Event) => {
    const isCorrectSection = event.section.toString() === section;

    if (!methods || methods.length === 0) {
      return isCorrectSection;
    }
    const isCorrectMethod = methods.includes(event.method.toString());

    return isCorrectSection && isCorrectMethod;
  };

  return api.query.system.events((events) => {
    for (const { event } of events) {
      if (isValidEvent(event)) {
        fn(event);
      }
    }
  });
};
