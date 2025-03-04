import {
  mockDelegatorVotingsX1,
  mockDelegatorVotingsX2,
  mockDirectVotings,
  mockMultipleDelegatorVotings,
} from '../../data/subquery/governance/governanceSubqueryMock';
import { expect, test } from '../../utils/baseRegularFixture';
import { interceptGovernanceSubquery } from '../../utils/httpInterception';

test.describe('Governance votes for completed referenda', { tag: ['@governance', '@regress'] }, () => {
  [
    { name: 'AYE X1', testData: mockDelegatorVotingsX1, expected: 'AYE 2,000 DOT via 🌌 Novasama 🌌' },
    { name: 'NAY X2', testData: mockDelegatorVotingsX2, expected: 'NAY 4,000 DOT via 🌌 Novasama 🌌' },
  ].forEach(({ name, testData, expected }) => {
    test(`Polkadot Vault, single wallet, should display delegated votes for ${name}`, async ({ page, loginPage }) => {
      await interceptGovernanceSubquery(page, testData);

      const vaultWallet = await loginPage.importDatabase('governance/governance-pv-root.json');
      const assetsPage = await vaultWallet.gotoMain();
      const governancePage = await assetsPage.goToGovernancePage();

      await governancePage.verifyProposalDetails({
        referendumId: '1300',
        voteDetails: expected,
      });
    });
  });

  [
    { name: 'AYE X1', testData: mockMultipleDelegatorVotings, expected: 'AYE 2,000 DOT via 🌌 Novasama 🌌' },
    { name: 'NAY X2', testData: mockMultipleDelegatorVotings, expected: 'NAY 4,000 DOT via 🌌 Novasama 🌌' },
  ].forEach(({ name, testData, expected }) => {
    test(`Polkadot Vault, DD wallet, should display delegated votes for ${name}`, async ({ page, loginPage }) => {
      await interceptGovernanceSubquery(page, testData);

      const vaultWallet = await loginPage.importDatabase('governance/pv-dd.json');
      const assetsPage = await vaultWallet.gotoMain();
      const governancePage = await assetsPage.goToGovernancePage();

      await governancePage.verifyProposalDetails({
        referendumId: '1300',
        voteDetails: expected,
      });
    });
  });

  test('Polkadot Vault, single wallet, should display direct votes', async ({ page, loginPage }) => {
    await interceptGovernanceSubquery(page, mockDirectVotings);

    const vaultWallet = await loginPage.importDatabase('governance/governance-pv-root.json');
    const assetsPage = await vaultWallet.gotoMain();
    const governancePage = await assetsPage.goToGovernancePage();
    await governancePage.searchReferenda('1300');

    await expect(page.getByText('AYE 1,000 DOT')).toBeVisible();
  });
});
