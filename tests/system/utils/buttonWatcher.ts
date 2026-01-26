import { type Locator, type Page } from '@playwright/test';

type WatcherOptions = {
  /** Polling interval in ms (default: 100) */
  pollInterval?: number;
  /** Custom error message */
  errorMessage?: string;
};

/**
 * Watches a button state while executing a callback. Fails immediately if the
 * button becomes enabled during callback execution.
 *
 * @example
 *   ```typescript
 *   const button = page.getByRole('button', { name: 'Continue' });
 *   await watchButtonDisabled(page, button, async () => {
 *     await checkValidations();
 *     await checkFees();
 *   });
 *   ```;
 */
export async function watchButtonDisabled<T>(
  page: Page,
  button: Locator,
  callback: () => Promise<T>,
  options: WatcherOptions = {},
): Promise<T> {
  const { pollInterval = 100, errorMessage } = options;

  let watcherStopped = false;
  let callbackResult: T;

  const buttonWatcher = async (): Promise<never> => {
    while (!watcherStopped) {
      if (await button.isEnabled()) {
        throw new Error(errorMessage ?? `Button became enabled during operation. Expected it to stay disabled.`);
      }
      await page.waitForTimeout(pollInterval);
    }
    // This never resolves normally - only throws or is stopped
    return new Promise(() => {});
  };

  const runCallback = async (): Promise<T> => {
    callbackResult = await callback();
    return callbackResult;
  };

  try {
    await Promise.race([runCallback(), buttonWatcher()]);
  } finally {
    watcherStopped = true;
  }

  return callbackResult!;
}

/**
 * Watches the Continue button state while executing a callback. Convenience
 * wrapper for the common "Continue" button case.
 *
 * @param page - Playwright page instance
 * @param callback - Async function to execute while watching
 * @param options - Watcher options
 */
export async function watchContinueButtonDisabled<T>(
  page: Page,
  callback: () => Promise<T>,
  options: Omit<WatcherOptions, 'errorMessage'> = {},
): Promise<T> {
  const button = page.getByRole('button', { name: 'Continue' });
  return watchButtonDisabled(page, button, callback, {
    ...options,
    errorMessage:
      'Continue button became enabled during validation checks. ' +
      'Expected it to stay disabled while validations are visible.',
  });
}
