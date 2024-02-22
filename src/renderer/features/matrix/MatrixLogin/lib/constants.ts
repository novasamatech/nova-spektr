import { WELL_KNOWN_SERVERS } from '@shared/api/matrix';

export const HOME_SERVERS = WELL_KNOWN_SERVERS.map((server) => ({
  id: server.domain,
  value: server.domain,
  element: server.domain,
}));
