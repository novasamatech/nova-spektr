import { type Transaction } from 'dexie';

import {
  type ChainId,
  type FlexibleMultisigOperationNotification,
  type MultisigCreated,
  type MultisigOperationNotification,
  type Notification,
  NotificationType,
  type ProxyAction,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type OldNotification = Omit<Notification, 'status' | 'issuer' | 'title' | 'description' | 'deepLink'>;

/**
 * Migration to add status, issuer, title, and description fields to existing
 * notifications
 */
export async function migrateNotificationStructure(t: Transaction): Promise<void> {
  const notifications = await t.table<OldNotification & Partial<Notification>>('notifications').toArray();

  const notificationsToUpdate = notifications.filter(
    (notification) => !notification.status || !notification.issuer || !notification.title,
  );

  if (notificationsToUpdate.length === 0) {
    return;
  }

  const updatedNotifications = notificationsToUpdate.map((notification) => {
    switch (notification.type) {
      case NotificationType.MULTISIG_CREATED: {
        const n = notification as OldNotification & Partial<MultisigCreated>;
        const description =
          n.threshold && n.signatories ? `Threshold ${n.threshold} out of ${n.signatories.length}` : undefined;

        return {
          ...notification,
          status: 'info',
          issuer: n.multisigAccountId || ('' as AccountId),
          chainId: n.chainId || ('0x' as ChainId),
          title: 'Multisig wallet created',
          description,
        };
      }

      case NotificationType.FLEXIBLE_MULTISIG_CREATED: {
        const n = notification as OldNotification & Partial<FlexibleMultisigOperationNotification>;
        const description =
          n.threshold && n.signatories ? `Threshold ${n.threshold} out of ${n.signatories.length}` : undefined;

        return {
          ...notification,
          status: 'info',
          issuer: n.accountId || ('' as AccountId),
          chainId: n.chainId || ('0x' as ChainId),
          title: 'Flexible multisig wallet created',
          description,
        };
      }

      case NotificationType.FLEXIBLE_MULTISIG_EDITED: {
        const n = notification as OldNotification & Partial<FlexibleMultisigOperationNotification>;
        const description =
          n.threshold && n.signatories ? `Threshold ${n.threshold} out of ${n.signatories.length}` : undefined;

        return {
          ...notification,
          status: 'info',
          issuer: n.accountId || ('' as AccountId),
          chainId: n.chainId || ('0x' as ChainId),
          title: 'Flexible multisig wallet edited',
          description,
        };
      }

      case NotificationType.MULTISIG_OPERATION: {
        const n = notification as OldNotification & Partial<MultisigOperationNotification>;

        if (n.operationStatus) {
          const status =
            n.operationStatus === 'executed' ? 'success' : n.operationStatus === 'created' ? 'info' : 'error';
          const title =
            n.operationStatus === 'created'
              ? 'Multisig operation created'
              : n.operationStatus === 'executed'
                ? 'Multisig operation executed'
                : n.operationStatus === 'cancelled'
                  ? 'Multisig operation cancelled'
                  : 'Multisig operation error';

          return {
            ...notification,
            status,
            issuer: n.issuer,
            title,
            chainId: n.chainId,
          };
        }

        return {
          ...notification,
          status: 'info',
          issuer: n.issuer,
          title: 'Multisig operation',
          chainId: n.chainId,
        };
      }

      case NotificationType.PROXY_CREATED: {
        const n = notification as OldNotification & Partial<ProxyAction>;
        const description = n.proxyType ? `${n.proxyType} proxy` : undefined;

        return {
          ...notification,
          status: 'info',
          issuer: n.proxyAccountId || ('' as AccountId),
          title: 'Proxy created',
          description,
          chainId: n.chainId,
        };
      }

      case NotificationType.PROXY_REMOVED: {
        const n = notification as OldNotification & Partial<ProxyAction>;
        const description = n.proxyType ? `${n.proxyType} proxy` : undefined;

        return {
          ...notification,
          status: 'error',
          issuer: n.proxyAccountId || ('' as AccountId),
          title: 'Proxy removed',
          description,
          chainId: n.chainId,
        };
      }

      default: {
        // Fallback for unknown or incomplete notification types
        const n = notification as OldNotification & Partial<Notification>;
        const issuer =
          ('multisigAccountId' in n && n.multisigAccountId) ||
          ('accountId' in n && n.accountId) ||
          ('proxyAccountId' in n && n.proxyAccountId) ||
          ('' as AccountId);

        return {
          ...notification,
          status: 'info',
          issuer,
          chainId: n.chainId || ('0x' as ChainId),
          title: 'Notification',
        };
      }
    }
  });

  await t.table('notifications').bulkPut(updatedNotifications);
}
