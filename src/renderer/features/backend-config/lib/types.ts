export const enum ConnectionStatus {
  NOT_TESTED = 'not_tested',
  TESTING = 'testing',
  CONNECTED = 'connected',
  FAILED = 'failed',
}

export type BackendConfig = {
  url: string;
  lastSyncTime: number | null;
};
