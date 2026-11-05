import { render, screen } from '@testing-library/react';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Notification } from '@/shared/core';

import { NotificationRowBoundary } from './NotificationRowBoundary';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const FALLBACK_KEY = 'notifications.rowUnavailable';
const BROKEN_ID = 2;

const createNotification = (id: number) => ({ id }) as unknown as Notification;

const Row = ({ notification }: { notification: Notification }) => {
  if (notification.id === BROKEN_ID) {
    throw new Error('Cannot render notification');
  }

  return <div>row {notification.id}</div>;
};

describe('NotificationRowBoundary', () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('replaces only the throwing notification with the placeholder and logs its id', () => {
    const notifications = [createNotification(1), createNotification(BROKEN_ID), createNotification(3)];

    render(
      <>
        {notifications.map((notification) => (
          <NotificationRowBoundary key={notification.id} notification={notification}>
            <Row notification={notification} />
          </NotificationRowBoundary>
        ))}
      </>,
    );

    expect(screen.getByText('row 1')).toBeInTheDocument();
    expect(screen.getByText('row 3')).toBeInTheDocument();
    expect(screen.queryByText(`row ${BROKEN_ID}`)).not.toBeInTheDocument();
    expect(screen.getAllByText(FALLBACK_KEY)).toHaveLength(1);
    expect(consoleError).toHaveBeenCalledWith(
      '[notifications] notification failed to render',
      { id: BROKEN_ID },
      expect.any(Error),
    );
  });
});
