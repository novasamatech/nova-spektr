export const NOTIFICATION_EVENTS = 'notification_events';
export const SELECTED_WALLET_IDS = 'selected_wallet_ids';

export enum NotificationEvent {
  WALLET_CREATED = 'wallet_created',
  OPERATION_CREATED = 'operation_created',
  OPERATION_EXECUTED = 'operation_executed',
  OPERATION_REJECTED = 'operation_rejected',
}
