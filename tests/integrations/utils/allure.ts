import * as allure from 'allure-js-commons';

export type AllureSeverity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export type AllureMetadata = {
  epic: string;
  feature: string;
  story: string;
  severity?: AllureSeverity;
};

/**
 * Applies Allure metadata to the current test. Call at the start of each test
 * for consistent reporting.
 *
 * @example
 *   it('should do something', async () => {
 *     await allureMetadata({
 *       epic: 'Fellowship',
 *       feature: 'Fellowship Members',
 *       story: 'Member List',
 *       severity: 'critical',
 *     });
 *     // test body...
 *   });
 */
export async function allureMetadata(meta: AllureMetadata): Promise<void> {
  await allure.epic(meta.epic);
  await allure.feature(meta.feature);
  await allure.story(meta.story);
  await allure.severity(meta.severity ?? 'normal');
}
