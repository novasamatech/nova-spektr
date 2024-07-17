import { combine, createEvent, createStore, sample } from 'effector';

import { isStringsMatchQuery } from '@shared/lib/utils';
import { HOME_SERVERS } from '../lib/constants';

const homeserverQueryChanged = createEvent<string>();

const $homeserverQuery = createStore<string>('');

const $homeServers = combine($homeserverQuery, (query) => {
  return HOME_SERVERS.reduce<typeof HOME_SERVERS>((acc, server) => {
    if (isStringsMatchQuery(query, [server.value])) {
      acc.push(server);
    }

    return acc;
  }, []);
});

sample({ clock: homeserverQueryChanged, target: $homeserverQuery });

export const matrixLoginModel = {
  $homeserverQuery,
  $homeServers,
  events: {
    homeserverQueryChanged,
  },
};
