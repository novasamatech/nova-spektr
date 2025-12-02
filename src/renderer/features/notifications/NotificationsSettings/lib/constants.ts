export const NOTIFICATION_SOURCE = 'notification_source';
export const NOTIFICATION_EVENTS = 'notification_events';

export enum NotificationSource {
  ALL = 'all',
  OPERATIONS = 'operations',
  WALLETS = 'wallets',
}

export enum NotificationEvent {
  WALLET_CREATED = 'wallet_created',
  OPERATION_CREATED = 'operation_created',
  OPERATION_EXECUTED = 'operation_executed',
  OPERATION_REJECTED = 'operation_rejected',
}
