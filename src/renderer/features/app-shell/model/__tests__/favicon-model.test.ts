import { allSettled, fork } from 'effector';

import { faviconModel } from '../favicon-model';

describe('features/app-shell/model/favicon-model', () => {
  test('should have no badge by default', () => {
    const scope = fork();

    expect(scope.getState(faviconModel.$hasBadge)).toBe(false);
  });

  test('should show badge when source is added', async () => {
    const scope = fork();

    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(true);
  });

  test('should hide badge when source is removed', async () => {
    const scope = fork();

    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });
    await allSettled(faviconModel.events.badgeSourceRemoved, { scope, params: 'notifications' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(false);
  });

  test('should keep badge when one of two sources is removed', async () => {
    const scope = fork();

    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });
    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'pendingTxs' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(true);

    await allSettled(faviconModel.events.badgeSourceRemoved, { scope, params: 'notifications' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(true);
  });

  test('should hide badge when all sources are removed', async () => {
    const scope = fork();

    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });
    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'pendingTxs' });

    await allSettled(faviconModel.events.badgeSourceRemoved, { scope, params: 'notifications' });
    await allSettled(faviconModel.events.badgeSourceRemoved, { scope, params: 'pendingTxs' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(false);
  });

  test('should not duplicate sources when added multiple times', async () => {
    const scope = fork();

    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });
    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });
    await allSettled(faviconModel.events.badgeSourceAdded, { scope, params: 'notifications' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(true);

    await allSettled(faviconModel.events.badgeSourceRemoved, { scope, params: 'notifications' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(false);
  });

  test('should handle removing non-existent source gracefully', async () => {
    const scope = fork();

    await allSettled(faviconModel.events.badgeSourceRemoved, { scope, params: 'nonExistent' });

    expect(scope.getState(faviconModel.$hasBadge)).toBe(false);
  });
});
