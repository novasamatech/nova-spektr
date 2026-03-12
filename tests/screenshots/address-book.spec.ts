import { expect, test } from '@playwright/test';

type Story = {
  id: string;
  state: string;
};

const COMPONENT_STORIES: Record<string, Story[]> = {
  ContactSkeleton: [{ id: 'address-book-contactskeleton--default', state: 'Default' }],
  BackendErrorView: [
    { id: 'address-book-backenderrorview--network-error', state: 'NetworkError' },
    { id: 'address-book-backenderrorview--auth-error', state: 'AuthError' },
    { id: 'address-book-backenderrorview--timeout-error', state: 'TimeoutError' },
    { id: 'address-book-backenderrorview--generic-error', state: 'GenericError' },
  ],
  EmptyBackendView: [{ id: 'address-book-emptybackendview--default', state: 'Default' }],
  ContactRow: [{ id: 'address-book-contactrow--default', state: 'Default' }],
  SyncStatusBadge: [
    { id: 'address-book-syncstatusbadge--idle', state: 'Idle' },
    { id: 'address-book-syncstatusbadge--syncing', state: 'Syncing' },
    { id: 'address-book-syncstatusbadge--synced-just-now', state: 'SyncedJustNow' },
    { id: 'address-book-syncstatusbadge--synced-minutes-ago', state: 'SyncedMinutesAgo' },
  ],
  AuthStatus: [
    { id: 'address-book-authstatus--connected', state: 'Connected' },
    { id: 'address-book-authstatus--disconnected', state: 'Disconnected' },
    { id: 'address-book-authstatus--session-expired', state: 'SessionExpired' },
  ],
  BackendConfigurationModal: [
    { id: 'address-book-backendconfigurationmodal--empty-input', state: 'EmptyInput' },
    { id: 'address-book-backendconfigurationmodal--url-checking', state: 'UrlChecking' },
    { id: 'address-book-backendconfigurationmodal--url-reachable', state: 'UrlReachable' },
    { id: 'address-book-backendconfigurationmodal--url-unreachable', state: 'UrlUnreachable' },
    { id: 'address-book-backendconfigurationmodal--connected-state', state: 'ConnectedState' },
    { id: 'address-book-backendconfigurationmodal--signing-state', state: 'SigningState' },
    { id: 'address-book-backendconfigurationmodal--error-state', state: 'ErrorState' },
  ],
  BackendSyncSettings: [
    { id: 'address-book-backendsyncsettings--configured-connected', state: 'ConfiguredConnected' },
    { id: 'address-book-backendsyncsettings--configured-disconnected', state: 'ConfiguredDisconnected' },
    { id: 'address-book-backendsyncsettings--not-configured', state: 'NotConfigured' },
  ],
  BackendContactRow: [
    { id: 'address-book-backendcontactrow--default', state: 'Default' },
    { id: 'address-book-backendcontactrow--minimal-labels', state: 'MinimalLabels' },
  ],
  CachedWithErrorView: [{ id: 'address-book-cachedwitherrorview--default', state: 'Default' }],
  BackendConnectionCard: [
    { id: 'address-book-backendconnectioncard--connected', state: 'Connected' },
    { id: 'address-book-backendconnectioncard--disconnected', state: 'Disconnected' },
    { id: 'address-book-backendconnectioncard--session-expired', state: 'SessionExpired' },
  ],
  BackendLoadingView: [{ id: 'address-book-backendloadingview--default', state: 'Default' }],
};

for (const [component, stories] of Object.entries(COMPONENT_STORIES)) {
  test.describe(component, () => {
    for (const story of stories) {
      test(story.state, async ({ page }) => {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${component}-${story.state}.png`, {
          fullPage: true,
        });
      });
    }
  });
}
